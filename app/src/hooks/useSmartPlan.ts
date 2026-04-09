
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

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

            // Also update student profile metrics
            await supabase
                .from('students')
                .update({ 
                    updated_at: new Date().toISOString()
                })
                .eq('id', studentId);

            toast.success('Training plan sent to student!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSending(false);
        }
    };

    // 4. Send Direct Targets (Independent of Full Plan)
    const sendDirectTargets = async (studentIdRaw: string, targetTime: number | '', targetJumps: number | '') => {
        setIsSending(true);
        try {
            const studentId = await resolveStudentId(studentIdRaw);
            const payload = {
                target_time: targetTime === '' ? null : targetTime,
                target_jumps: targetJumps === '' ? null : targetJumps,
                plan_content: [], // Minimal empty plan
                status: 'direct_target',
                bmr: 0, tdee: 0, target_calories: 0 // Default numericals required by previous schema
            };

            console.log("SEND DIRECT TARGETS PAYLOAD:", { studentId, targetTime, targetJumps });

            // 1. Try UPDATE directly
            const { data: updateData, error: updateError } = await supabase
                .from('training_plans')
                .update(payload)
                .eq('student_id', studentId)
                .select('id');

            console.log("DIRECT TARGET UPDATE RESULT:", { updateData, updateError });

            let dbError = updateError;

            // 2. If no rows updated, execute INSERT
            if (!updateData || updateData.length === 0) {
                console.log("DIRECT TARGET UPDATE TOUCHED 0 ROWS. ATTEMPTING INSERT...");
                const { error: insertError } = await supabase
                    .from('training_plans')
                    .insert({ student_id: studentId, ...payload });
                
                console.log("DIRECT TARGET INSERT ERROR RAW:", insertError);
                dbError = insertError;
            }

            if (dbError) {
                console.error("DIRECT TARGET FINAL DB ERROR:", JSON.stringify(dbError, null, 2));
                throw dbError;
            }
            
            toast.success('Session targets broadcasted directly!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSending(false);
        }
    };

    return { generateAIPlan, sendPlan, sendDirectTargets, isGenerating, isSending };
}
