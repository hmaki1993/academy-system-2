import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { NotificationExpert } from '../utils/NotificationExpert';

export interface TrainingMetric {
    age: number;
    weight: number;
    height: number;
    daysPerWeek: number;
    gender: 'female' | 'male';
    language: 'en' | 'ar';
}

export interface GeneratedPlan {
    bmr: number;
    tdee: number;
    targetCalories: number;
    targetTime?: number;
    targetJumps?: number;
    weeklyPlan: {
        day: string;
        focus: string;
        details: string[];
    }[];
}

export function useSmartPlan() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const queryClient = useQueryClient();

    // Helper to resolve an ID that might be a profile_id (from JumpRopeAdmin auth) into an actual students.id
    const resolveStudentId = async (possibleProfileIdOrStudentId: string): Promise<string> => {
        // 1. First, check if it's already a valid students.id
        const { data: directStudent } = await supabase
            .from('students')
            .select('id')
            .eq('id', possibleProfileIdOrStudentId)
            .maybeSingle();
        
        if (directStudent && directStudent.id) return directStudent.id;

        // 2. If not, maybe it's a profile_id (from Jump_rope_sessions.user_id)
        const { data: profileStudent } = await supabase
            .from('students')
            .select('id')
            .eq('profile_id', possibleProfileIdOrStudentId)
            .maybeSingle();

        if (profileStudent && profileStudent.id) return profileStudent.id;

        // 3. Auto-register the athlete in the students table (JIT Provisioning)
        console.log("No student record found. Auto-registering athlete...");
        
        // Fetch their name from profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', possibleProfileIdOrStudentId)
            .maybeSingle();

        const { data: newStudent, error: createError } = await supabase
            .from('students')
            .insert({
                profile_id: possibleProfileIdOrStudentId,
                full_name: profile?.full_name || 'Jump Rope Athlete',
            })
            .select('id')
            .single();

        if (newStudent && newStudent.id) {
            console.log("Athlete gracefully auto-registered as student:", newStudent.id);
            return newStudent.id;
        }

        console.error("Failed to auto-register athlete:", createError);
        throw new Error('لم يتم العثور على حساب متدرب، وفشل النظام في إنشائه تلقائياً بسبب نقص في البيانات.');
    };

    // 1. Calculate Bio-Metrics
    const calculateMetrics = (m: TrainingMetric) => {
        // Mifflin-St Jeor Equation
        const bmr = (10 * m.weight) + (6.25 * m.height) - (5 * m.age) - 161;
        const tdee = bmr * 1.375;
        const targetCalories = Math.round(tdee * 0.8);

        return { bmr: Math.round(bmr), tdee: Math.round(tdee), targetCalories };
    };

    // 2. AI Generation Logic (Simplified Jump-Only)
    const generateAIPlan = async (studentId: string, m: TrainingMetric): Promise<GeneratedPlan> => {
        setIsGenerating(true);
        try {
            const { bmr, tdee, targetCalories } = calculateMetrics(m);
            const deficitWeight = Math.round(tdee - targetCalories);
            
            // Smarter Logic: Don't burn the WHOLE deficit with jump rope.
            // Aim for a moderate workload (1000 to 4000 jumps max)
            let baseJumps = 1000 + (deficitWeight * 1.5);
            
            // Safety cap - nobody should be doing 10k jumps daily unless pro
            baseJumps = Math.min(4000, Math.max(800, baseJumps));

            const isAr = m.language === 'ar';

            // Generate exactly 'daysPerWeek' training days
            const weeklyPlan = Array.from({ length: m.daysPerWeek }, (_, i) => {
                // Progression: Day 1 is easier, last day is peak. Rounded to nearest 50.
                const dayTotal = Math.round((baseJumps * (0.85 + (i * 0.1))) / 50) * 50;
                // Keep sets manageable (150-300 per set)
                const repsPerSet = dayTotal > 2000 ? 250 : 150;
                const daySets = Math.ceil(dayTotal / repsPerSet);
                
                // Est. Time: Approx 100 jumps per min + rest
                const estMinutes = Math.ceil(dayTotal / 100) + (daySets - 1);
                const minsPerSet = (repsPerSet / 100).toFixed(1);
                
                return {
                    day: isAr ? `اليوم ${i + 1}` : `Day ${i + 1}`,
                    focus: isAr ? "تدريب القفز" : "JUMP TRAINING",
                    details: [
                        isAr ? `الإجمالي: ${dayTotal} قفزة` : `Total: ${dayTotal} Jumps`,
                        isAr ? `التقسيم: ${daySets} مجموعات × ${repsPerSet} (${minsPerSet} دقايق للمجموعة)` : `Structure: ${daySets} Sets x ${repsPerSet} (${minsPerSet} mins/set)`,
                        isAr ? `الوقت المتوقع: ${estMinutes} دقيقة` : `Est. Time: ${estMinutes} mins`
                    ]
                };
            });

            return { bmr, tdee, targetCalories, weeklyPlan };
        } finally {
            setIsGenerating(false);
        }
    };

    // 3. Send Plan to DB
    const sendPlan = async (studentIdRaw: string, plan: GeneratedPlan) => {
        setIsSending(true);
        try {
            const studentId = await resolveStudentId(studentIdRaw);
            const payload = {
                bmr: plan.bmr,
                tdee: plan.tdee,
                target_calories: plan.targetCalories,
                target_time: plan.targetTime,
                target_jumps: plan.targetJumps,
                plan_content: plan.weeklyPlan,
                status: 'sent'
            };

            console.log("SEND PLAN PAYLOAD:", { studentId, payload });

            // 1. Try to UPDATE first (based on student_id)
            const { data: updateData, error: updateError } = await supabase
                .from('training_plans')
                .update(payload)
                .eq('student_id', studentId)
                .select('id');

            console.log("UPDATE RESULT:", { updateData, updateError });

            let dbError = updateError;

            // 2. If update touched 0 rows, the plan doesn't exist, so we INSERT
            if (!updateData || updateData.length === 0) {
                console.log("UPDATE TOUCHED 0 ROWS. ATTEMPTING INSERT...");
                const { error: insertError } = await supabase
                    .from('training_plans')
                    .insert({ student_id: studentId, ...payload });
                
                console.log("INSERT ERROR RAW:", insertError);
                dbError = insertError;
            }

            if (dbError) {
                console.error("FINAL DB ERROR:", JSON.stringify(dbError, null, 2));
                toast.error('لم يتم الحفظ في القاعدة بسبب الصلاحيات، جاري إرسال الإشعار...');
                // throw dbError; // 🚀 TEMPORARILY DISABLED: Allow Push Notification to fire!
            }

            // 3. Real-time Broadcast (Immediate Dashboard/App Sync)
            const channel = supabase.channel(`athlete-live-ctrl-${studentIdRaw}`);
            await channel.subscribe(async (statusSub) => {
                if (statusSub === 'SUBSCRIBED') {
                    await channel.send({
                        type: 'broadcast',
                        event: 'session_update',
                        payload: { 
                            status: 'sent', 
                            timestamp: new Date().toISOString(),
                            refresh_plan: true // Signal to athlete app to refetch the full plan
                        }
                    });
                    supabase.removeChannel(channel);
                }
            });

            queryClient.invalidateQueries({ queryKey: ['training_plan_history', studentId] });
            queryClient.invalidateQueries({ queryKey: ['training_plan_history', studentIdRaw] });
            
            // 🚀 MASTER PUSH: Unified command for FCM + Broadcast
            await import('../utils/NotificationExpert').then(m => {
                m.NotificationExpert.invokePush(
                    studentIdRaw, 
                    '🏆 New Training Plan!', 
                    'Click to view your new smart mission goals.'
                );
            });
            
            toast.success('Training plan sent to student!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSending(false);
        }
    };

    // 4. Send Direct Targets (Independent of Full Plan)
    const sendDirectTargets = async (studentIdRaw: string, targetTime: number | '', targetJumps: number | '', scheduledStart: string | null = null) => {
        setIsSending(true);
        try {
            // Helper to format time (HH:mm or ISO -> AM/PM)
            const formatTime = (timeStr: string | null) => {
                if (!timeStr) return "Now";
                try {
                    if (timeStr.includes('T')) {
                        return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    }
                    if (timeStr.includes(':')) {
                        const [h, m] = timeStr.split(':').map(Number);
                        const period = h >= 12 ? 'PM' : 'AM';
                        const h12 = h % 12 || 12;
                        return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
                    }
                } catch (e) {}
                return timeStr;
            };

            const timeDisplay = formatTime(scheduledStart);
            const jumpsDisplay = targetJumps || '0';
            const minsDisplay = targetTime || '0';
            
            // 🛡️ DYNAMIC MESSAGE: Cleaner, more professional notification text
            const finalMessage = `🚀 New Mission from Coach Maryam: ${jumpsDisplay} jumps & ${minsDisplay} mins starting at ${timeDisplay}. Good luck!`;

            // 1. Resolve Identity and Prepare State
            const studentId = await resolveStudentId(studentIdRaw);
            const payload = {
                target_time: targetTime === '' ? null : targetTime,
                target_jumps: targetJumps === '' ? null : targetJumps,
                scheduled_start: scheduledStart,
                status: scheduledStart ? 'scheduled' : 'live'
            };

            // 🚀 BULLET SYNC: Triple-Broadcast Protocol (Ensures delivery)
            // 🚀 BULLET SYNC: Triple-Pulse on UNIFIED CHANNEL
            const channelId = `user-notifications:${studentIdRaw}`;
            const bc = supabase.channel(channelId);
            
            bc.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`📡 COACH: Bullet Sync Pipe Hot [${channelId}]. Despatching TRIPLE pulse...`);
                    
                    const syncPayload = { 
                        type: 'target_update',
                        status: payload.status,
                        target_jumps: payload.target_jumps,
                        target_time: payload.target_time,
                        scheduled_start: payload.scheduled_start,
                        refresh_plan: true,
                        timestamp: new Date().toISOString()
                    };

                    // Pulse 1: Instant
                    console.log(`🚀 COACH: Pulse 1 despatcing to [${studentIdRaw}]`);
                    await bc.send({ type: 'broadcast', event: 'SYNC_ALERTS', payload: syncPayload });
                    
                    // Pulse 2: 300ms 
                    setTimeout(() => {
                        console.log(`🚀 COACH: Pulse 2 despatcing...`);
                        bc.send({ type: 'broadcast', event: 'SYNC_ALERTS', payload: syncPayload });
                    }, 300);
                    
                    // Pulse 3: 800ms
                    setTimeout(() => {
                        console.log(`🚀 COACH: Pulse 3 despatcing...`);
                        bc.send({ type: 'broadcast', event: 'SYNC_ALERTS', payload: syncPayload });
                    }, 800);

                    // Force DB Refresh signal for any legacy components
                    await bc.send({ type: 'broadcast', event: 'mission-alert', payload: { ...syncPayload, type: 'REFRESH_REQUIRED' } });

                    setTimeout(() => supabase.removeChannel(bc), 5000);
                }
            });

            // 1. Resolve Identity and Persistence (Background)
            resolveStudentId(studentIdRaw).then(studentId => {
                supabase.from('training_plans')
                    .update(payload)
                    .eq('student_id', studentId)
                    .select('id')
                    .then(({ data: updateData, error: updateError }) => {
                        if (updateError) console.error("FIRE/ROCKET DB UPDATE ERROR (BG):", updateError);
                        
                        if (!updateData || updateData.length === 0) {
                            supabase.from('training_plans')
                                .insert({ student_id: studentId, ...payload })
                                .then(({ error: insertError }) => {
                                    if (insertError) console.error("FIRE/ROCKET DB INSERT ERROR (BG):", insertError);
                                });
                        }
                        queryClient.invalidateQueries({ queryKey: ['training_plans', studentId] });
                    });
            });

            // 📱 BACKUP PUSH: FCM for Background Delivery
            await import('../utils/NotificationExpert').then(m => {
                m.NotificationExpert.invokePush(
                    studentIdRaw, 
                    '🎯 Ready for Mission?', 
                    finalMessage
                );
            });

            queryClient.invalidateQueries({ queryKey: ['training_plans', studentId] });
            
            toast.success('Session targets updated!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSending(false);
        }
    };

    // 5. Update Session Lifecycle (Pause, Resume, Stop)
    const updateSessionStatus = async (studentIdRaw: string, status: 'live' | 'paused' | 'idle' | 'restarting') => {
        setIsSending(true);
        try {
            const studentId = await resolveStudentId(studentIdRaw);
            
            // Atomic status updates
            let finalStatus: string = status;
            const payload: any = {};

            // Context-aware Restarting Logic
            if (status === 'restarting') {
                // 1. Fetch current status from DB first
                const { data: currentPlan } = await supabase
                    .from('training_plans')
                    .select('status')
                    .eq('student_id', studentId)
                    .maybeSingle();

                const currentStatus = currentPlan?.status || 'idle';

                // 2. Decision: Keep 'live' if already active, otherwise go to 'ready'
                if (currentStatus === 'live' || currentStatus === 'paused') {
                    finalStatus = 'live'; // Keep it live, just reset the time
                } else {
                    finalStatus = 'ready'; // Reset to ready
                }
                
                payload.scheduled_start = new Date().toISOString();
            } else if (status === 'live') {
                // 🎯 FRESH START: When session goes live from idle/ready
                payload.scheduled_start = new Date().toISOString();
            }

            payload.status = finalStatus;

            if (status === 'idle') {
                payload.target_time = null;
                payload.target_jumps = null;
                // 🛡️ Persistence: Don't clear scheduled_start so the timer stays visible at 00:00
            }


            // 🎯 BULLET SYNC: Triple-Broadcast Status Update
            const channelId = `user-notifications:${studentIdRaw}`;
            const bc = supabase.channel(channelId);
            
            bc.subscribe(async (statusSub) => {
                if (statusSub === 'SUBSCRIBED') {
                    console.log(`📡 COACH: Status Pipe Hot. Despatching TRIPLE status pulse [${finalStatus}]...`);
                    
                    const statusPayload = { 
                        type: 'session_status_update',
                        status: finalStatus,
                        scheduled_start: payload.scheduled_start || null,
                        timestamp: new Date().toISOString()
                    };

                    // Triple Burst on UNIFIED CHANNEL
                    await bc.send({ type: 'broadcast', event: 'SYNC_ALERTS', payload: statusPayload });
                    setTimeout(() => bc.send({ type: 'broadcast', event: 'SYNC_ALERTS', payload: statusPayload }), 300);
                    setTimeout(() => bc.send({ type: 'broadcast', event: 'SYNC_ALERTS', payload: statusPayload }), 800);

                    // Fallback signal
                    await bc.send({ type: 'broadcast', event: 'mission-alert', payload: { type: 'REFRESH_REQUIRED' } });

                    setTimeout(() => supabase.removeChannel(bc), 5000);
                }
            });

            // 2. Database Update (Persistence) - Background priority
            resolveStudentId(studentIdRaw).then(studentId => {
                supabase.from('training_plans')
                    .update(payload)
                    .eq('student_id', studentId)
                    .then(({ error }) => {
                        if (error) console.error("Session Status Persistence Error:", error);
                    });
            });
            
            if (status === 'live') toast.success('Session Resumed');
            if (status === 'paused') toast.success('Session Paused');
            if (status === 'idle') toast.success('Session Stopped');
            if (status === 'restarting') toast.success('Session Restarting...');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSending(false);
        }
    };

    return { generateAIPlan, sendPlan, sendDirectTargets, updateSessionStatus, isGenerating, isSending };
}
