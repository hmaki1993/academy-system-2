import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { sendToN8n } from '../services/n8nService';
import { format } from 'date-fns';
import { DAY_FULL_NAMES, DEFAULT_SESSION_CAPACITY } from '../constants/scheduleConstants';

export function useStudentSubmit(initialData?: any, onSuccess?: () => void, onClose?: () => void) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ formData, plans, calculatedAge, calculatedExpiry }: any) => {
            if (!plans || plans.length === 0) {
                throw new Error("No subscription plans found. Please create a plan first.");
            }

            const expiry = (formData.subscription_expiry && formData.subscription_expiry.trim() !== '')
                ? formData.subscription_expiry
                : calculatedExpiry;

            const studentData = {
                full_name: formData.full_name,
                father_name: formData.father_name,
                mother_name: formData.mother_name,
                email: formData.email,
                address: formData.address,
                birth_date: formData.birth_date && formData.birth_date.trim() !== '' ? formData.birth_date : null,
                gender: formData.gender,
                training_type: formData.training_type,
                age: calculatedAge,
                contact_number: `${formData.country_code_student} ${formData.contact_number}`,
                parent_contact: `${formData.country_code_parent} ${formData.parent_contact}`,
                subscription_expiry: expiry && expiry.trim() !== '' ? expiry : null,
                training_days: formData.training_days,
                training_schedule: formData.training_schedule,
                coach_id: formData.coach_id && formData.coach_id.trim() !== '' ? formData.coach_id : null,
                subscription_plan_id: formData.subscription_type && formData.subscription_type.trim() !== '' ? formData.subscription_type : null,
                sessions_remaining: plans.find((p:any) => p.id === formData.subscription_type)?.sessions_limit || null,
                notes: formData.notes,
                training_group_id: formData.training_group_id && formData.training_group_id.trim() !== '' ? formData.training_group_id : null
            };

            let studentId = initialData?.id;

            if (initialData) {
                // Determine financial differences if plan changed
                if (initialData.subscription_plan_id !== formData.subscription_type) {
                    try {
                        const oldPlan = plans.find((p:any) => String(p.id) === String(initialData.subscription_plan_id));
                        const newPlan = plans.find((p:any) => String(p.id) === String(formData.subscription_type));

                        const oldPrice = oldPlan ? Number(oldPlan.price) : 0;
                        const newPrice = newPlan ? Number(newPlan.price) : 0;
                        const difference = newPrice - oldPrice;

                        const { data: { user } } = await supabase.auth.getUser();
                        const today = format(new Date(), 'yyyy-MM-dd');

                        if (difference > 0) {
                            await supabase.from('payments').insert({
                                student_id: initialData.id,
                                amount: difference,
                                payment_method: 'cash',
                                notes: `Plan Update (${oldPlan?.name || 'No Plan'} -> ${newPlan?.name || 'No Plan'})`,
                                payment_date: today,
                                created_by: user?.id
                            });
                        } else if (difference < 0) {
                            await supabase.from('payments').insert({
                                student_id: initialData.id,
                                amount: difference, 
                                payment_method: 'cash',
                                notes: `Plan Downgrade Adjustment (${oldPlan?.name || 'No Plan'} -> ${newPlan?.name || 'No Plan'})`,
                                payment_date: today,
                                created_by: user?.id
                            });
                        }
                    } catch (financeErr) {
                        console.error('Failed to log plan change in Finance:', financeErr);
                    }
                }

                const { error } = await supabase.from('students').update(studentData).eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { data, error: insertError } = await supabase.from('students').insert([studentData]).select('id').single();
                if (insertError) throw insertError;
                studentId = data?.id;

                if (studentId && formData.subscription_type) {
                    const selectedPlan = plans.find((p:any) => p.id === formData.subscription_type);
                    if (selectedPlan && selectedPlan.price > 0) {
                        try {
                            const { error: paymentError } = await supabase.from('payments').insert({
                                student_id: studentId,
                                amount: Number(selectedPlan.price),
                                payment_date: formData.subscription_start || format(new Date(), 'yyyy-MM-dd'),
                                payment_method: 'cash',
                                notes: `New Registration - ${selectedPlan.name}`
                            });
                            if (paymentError) console.error('Initial payment record failed:', paymentError);
                        } catch (payErr) {
                            console.error('Payment insertion error:', payErr);
                        }
                    }
                }
            }

            if (studentId && formData.training_schedule.length > 0) {
                if (initialData) {
                    await supabase.from('student_training_schedule').delete().eq('student_id', studentId);
                }

                const trainingInserts = formData.training_schedule.map((s: any) => ({
                    student_id: studentId,
                    day_of_week: s.day,
                    start_time: s.start,
                    end_time: s.end
                }));

                const { error: trainingError } = await supabase.from('student_training_schedule').insert(trainingInserts);
                if (trainingError) throw trainingError;

                if (formData.coach_id) {
                    // Run all session-creation checks in parallel (was serial for..of)
                    await Promise.all(
                        formData.training_schedule.map(async (schedule: any) => {
                            const { day, start, end } = schedule as { day: string, start: string, end: string };
                            const fullDayName = DAY_FULL_NAMES[day as keyof typeof DAY_FULL_NAMES] || day;

                            const { data: sessions } = await supabase.from('training_sessions')
                                .select('id').eq('coach_id', formData.coach_id).eq('day_of_week', fullDayName)
                                .eq('start_time', start).eq('end_time', end).limit(1);

                            if (!sessions || sessions.length === 0) {
                                await supabase.from('training_sessions').insert([{
                                    coach_id: formData.coach_id,
                                    day_of_week: fullDayName,
                                    start_time: start,
                                    end_time: end,
                                    title: 'Group Training',
                                    capacity: DEFAULT_SESSION_CAPACITY
                                }]);
                            }
                        })
                    );
                }
            }

            if (!initialData && studentId) {
                try {
                    const selectedPlan = plans.find((p:any) => p.id === formData.subscription_type);
                    const fullPhone = `${formData.country_code_parent} ${formData.parent_contact}`;
                    sendToN8n('new_student_registration', {
                        student_id: studentId,
                        student_name: formData.full_name,
                        parent_phone: fullPhone,
                        email: formData.email,
                        subscription_plan: selectedPlan?.name || 'N/A',
                        registration_date: new Date().toISOString(),
                        source: 'admin_dashboard'
                    });
                } catch (n8nErr) {
                    console.error('Failed to trigger n8n automation:', n8nErr);
                }
            }

            return studentId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['refunds'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['training_groups'] });

            toast.success(initialData ? 'Gymnast updated successfully' : 'Gymnast added successfully', {
                icon: '🎉',
                style: { borderRadius: '20px', background: '#10B981', color: '#fff' }
            });

            if (onSuccess) onSuccess();
            if (onClose) onClose();
        },
        onError: (error: any) => {
            console.error('Error saving gymnast:', error);
            const msg = error.message || 'Unknown error';
            toast.error(`Error saving gymnast: ${msg}`);
        }
    });
}
