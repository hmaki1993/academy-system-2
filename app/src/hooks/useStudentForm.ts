import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useSubscriptionPlans, useGroups } from './useData';
import { calculateAge, calculateExpiry } from '../utils/dateUtils';
import { normalizeDay, normalizeTime } from '../constants/scheduleConstants';

// Re-export so consumers don't need two imports
export { calculateAge };

export function useStudentForm(initialData?: any) {
    const { data: plansData } = useSubscriptionPlans();
    const plans = plansData || [];
    const { data: groups } = useGroups();

    const [formData, setFormData] = useState({
        full_name: initialData?.full_name || '',
        father_name: initialData?.father_name || '',
        mother_name: initialData?.mother_name || '',
        email: initialData?.email || '',
        address: initialData?.address || '',
        birth_date: initialData?.birth_date || '',
        gender: initialData?.gender || 'male',
        training_type: initialData?.training_type || '',
        contact_number: initialData?.contact_number || '',
        country_code_student: '+965',
        parent_contact: initialData?.parent_contact || '',
        country_code_parent: '+965',
        subscription_type: initialData?.subscription_plan_id || '',
        subscription_start: initialData?.subscription_start || format(new Date(), 'yyyy-MM-dd'),
        subscription_expiry: initialData?.subscription_expiry || '',
        training_days: initialData?.training_days?.map(normalizeDay) || [],
        training_schedule: initialData?.training_schedule?.map((s: any) => ({
            ...s,
            day: normalizeDay(s.day),
            start: normalizeTime(s.start),
            end: normalizeTime(s.end)
        })) || [],
        coach_id: initialData?.coach_id || '',
        training_group_id: initialData?.training_group_id || '',
        notes: initialData?.notes || ''
    });

    // Stable ref so the effect doesn't re-fire when parent re-renders with a new object reference
    const isEditMode = useRef(!!initialData);

    // Default to first plan on load (only runs once on mount in create-mode)
    useEffect(() => {
        if (!isEditMode.current && plans.length > 0) {
            setFormData(prev => {
                if (prev.subscription_type) return prev; // already set
                return { ...prev, subscription_type: plans[0].id };
            });
        }
    }, [plans]);

    // Auto-calculate expiry whenever plan or start date changes
    useEffect(() => {
        if (formData.subscription_start && formData.subscription_type && plans.length > 0) {
            const plan = plans.find((p: any) => p.id === formData.subscription_type) || plans[0];
            const expiry = calculateExpiry(formData.subscription_start, plan?.duration_months || 1);
            setFormData(prev => ({ ...prev, subscription_expiry: expiry }));
        }
    }, [formData.subscription_start, formData.subscription_type, plans]);

    const handleGroupChange = (groupId: string) => {
        const group = groups?.find((g: any) => g.id === groupId);
        if (group) {
            const scheduleKey = group.schedule_key || '';
            const parts = scheduleKey.split('|');
            const trainingDays: string[] = [];
            const trainingSchedule: any[] = [];

            parts.forEach((part: string) => {
                const subParts = part.split(':');
                if (subParts.length >= 1) {
                    const day = normalizeDay(subParts[0]);
                    trainingDays.push(day);
                    if (subParts.length >= 3) {
                        trainingSchedule.push({
                            day,
                            start: normalizeTime(`${subParts[1]}:${subParts[2]}`),
                            end: subParts.length >= 5 ? normalizeTime(`${subParts[3]}:${subParts[4]}`) : '18:00'
                        });
                    } else {
                        trainingSchedule.push({ day, start: '16:00', end: '18:00' });
                    }
                }
            });

            setFormData(prev => ({
                ...prev,
                training_group_id: groupId,
                coach_id: group.coach_id || prev.coach_id,
                training_days: trainingDays.length > 0 ? trainingDays : prev.training_days,
                training_schedule: trainingSchedule.length > 0 ? trainingSchedule : prev.training_schedule
            }));
        } else {
            setFormData(prev => ({ ...prev, training_group_id: '' }));
        }
    };

    const toggleDay = (day: string) => {
        setFormData(prev => {
            const isAlreadyActive = prev.training_days.includes(day);
            if (isAlreadyActive) {
                return {
                    ...prev,
                    training_days: prev.training_days.filter((d: string) => d !== day),
                    training_schedule: prev.training_schedule.filter((s: any) => s.day !== day)
                };
            } else {
                return {
                    ...prev,
                    training_days: [...prev.training_days, day],
                    training_schedule: [...prev.training_schedule, { day, start: '16:00', end: '18:00' }]
                };
            }
        });
    };

    const updateTime = (day: string, type: 'start' | 'end', value: string) => {
        setFormData(prev => ({
            ...prev,
            training_schedule: prev.training_schedule.map((s: any) =>
                s.day === day ? { ...s, [type]: value } : s
            )
        }));
    };

    return {
        formData,
        setFormData,
        handleGroupChange,
        toggleDay,
        updateTime,
        plans,
        groups
    };
}
