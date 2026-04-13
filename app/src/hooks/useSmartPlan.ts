
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

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
                throw dbError;
            }

            // 3. Persistent Database Notification (for the Bell Icon)
            const { data: studentProfile } = await supabase
                .from('students')
                .select('profile_id, full_name')
                .eq('id', studentId)
                .single();

            if (studentProfile?.profile_id) {
                const msg = `الكوتش بعتلك جدول تدريب جديد للأسبوع! افتح صفحة التدريب عشان تشوف التفاصيل.`;

                await supabase.from('notifications').insert({
                    user_id: studentProfile.profile_id,
                    type: 'training',
                    title: 'جدول تدريب جديد 🗓️',
                    message: msg,
                    is_read: false
                });

                // 4. Direct Broadcast (Instant Sync for Notification Bell)
                const channel = supabase.channel(`athlete-broadcast-${studentProfile.profile_id}`);
                await channel.subscribe(async (statusSub) => {
                    if (statusSub === 'SUBSCRIBED') {
                        await channel.send({
                            type: 'broadcast',
                            event: 'SYNC_ALERTS',
                            payload: { 
                                type: 'training_update',
                                message: msg,
                                timestamp: new Date().toISOString()
                            }
                        });
                        supabase.removeChannel(channel);
                    }
                });
            }

            // 5. legacy Broadcast for JumpRopeTraining page internal sync
            const legacyChannel = supabase.channel(`direct_broadcasts_${studentId}`);
            await legacyChannel.subscribe(async (statusSub) => {
                if (statusSub === 'SUBSCRIBED') {
                    await legacyChannel.send({
                        type: 'broadcast',
                        event: 'session_update',
                        payload: { 
                            status: 'sent', 
                            timestamp: new Date().toISOString(),
                            refresh_plan: true 
                        }
                    });
                    supabase.removeChannel(legacyChannel);
                }
            });

            queryClient.invalidateQueries({ queryKey: ['training_plan_history', studentId] });
            queryClient.invalidateQueries({ queryKey: ['training_plan_history', studentIdRaw] });
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
            const studentId = await resolveStudentId(studentIdRaw);
            const sessionStartAt = new Date().toISOString();
            const payload = {
                target_time: targetTime === '' ? null : targetTime,
                target_jumps: targetJumps === '' ? null : targetJumps,
                scheduled_start: scheduledStart,
                status: scheduledStart ? 'scheduled' : 'live'
            };

            // Atomic update - leave plan_content and other fields untouched
            const { error: updateError } = await supabase
                .from('training_plans')
                .update(payload)
                .eq('student_id', studentId);
            
            if (updateError) throw updateError;

            // If no plan starts yet, ensure we at least have a record
            const { data } = await supabase.from('training_plans').select('id').eq('student_id', studentId).maybeSingle();
            if (!data) {
                await supabase.from('training_plans').insert({ 
                    student_id: studentId, 
                    ...payload,
                    plan_content: [], // Minimal default for new record
                    bmr: 0, tdee: 0, target_calories: 0
                });
            }

            // 2. Persistent Database Notification (for the Bell Icon)
            const { data: studentProfile } = await supabase
                .from('students')
                .select('profile_id, full_name')
                .eq('id', studentId)
                .single();

            if (studentProfile?.profile_id) {
                const timeDesc = targetTime ? `${targetTime} دقيقة` : 'غير محدد';
                const jumpsDesc = targetJumps ? `${targetJumps} قفزة` : 'غير محدد';
                const msg = `الكوتش حددلك تمرين جديد! الهدف: ${jumpsDesc} | الوقت: ${timeDesc}`;

                await supabase.from('notifications').insert({
                    user_id: studentProfile.profile_id,
                    type: 'training',
                    title: 'تمرين جديد 🎯',
                    message: msg,
                    is_read: false
                });

                // 3. Direct Broadcast (Instant Sync for Remote Unlock & Notification Bell)
                const channel = supabase.channel(`athlete-broadcast-${studentProfile.profile_id}`);
                await channel.subscribe(async (statusSub) => {
                    if (statusSub === 'SUBSCRIBED') {
                        await channel.send({
                            type: 'broadcast',
                            event: 'SYNC_ALERTS', // This triggers the red dot and notification fetch in DashboardLayout
                            payload: { 
                                type: 'training_update',
                                message: msg,
                                timestamp: new Date().toISOString()
                            }
                        });
                        supabase.removeChannel(channel);
                    }
                });
            }

            // 4. legacy Broadcast for JumpRopeTraining page internal sync
            const legacyChannel = supabase.channel(`direct_broadcasts_${studentId}`);
            await legacyChannel.subscribe(async (statusSub) => {
                if (statusSub === 'SUBSCRIBED') {
                    await legacyChannel.send({
                        type: 'broadcast',
                        event: 'session_update',
                        payload: { 
                            status: payload.status, 
                            target_time: targetTime, 
                            target_jumps: targetJumps, 
                            scheduled_start: scheduledStart,
                            session_start_at: sessionStartAt,
                            timestamp: new Date().toISOString(),
                            refresh_plan: true 
                        }
                    });
                    supabase.removeChannel(legacyChannel);
                }
            });

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

            if (status === 'restarting') {
                finalStatus = 'live'; // Effectively starts it immediately from 0
                payload.scheduled_start = new Date().toISOString();
            }

            if (status === 'idle') {
                payload.target_time = null;
                payload.target_jumps = null;
                payload.scheduled_start = null;
            }

            payload.status = finalStatus;

            // 1. Database Update (Persistence)
            const { error } = await supabase
                .from('training_plans')
                .update(payload)
                .eq('student_id', studentId);

            if (error) throw error;

            // 2. Direct Broadcast (Instant Sync)
            const channel = supabase.channel(`direct_broadcasts_${studentId}`);
            await channel.subscribe(async (statusSub) => {
                if (statusSub === 'SUBSCRIBED') {
                    await channel.send({
                        type: 'broadcast',
                        event: 'session_update',
                        payload: { 
                            ...payload, 
                            timestamp: new Date().toISOString(),
                            refresh_plan: status === 'idle'
                        }
                    });
                    supabase.removeChannel(channel);
                }
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
