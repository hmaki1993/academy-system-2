import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';

export const generateScheduleKey = (schedule: any[]) => {
    if (!schedule || schedule.length === 0) return '';
    return schedule
        .map((s: any) => `${s.day}:${s.start}:${s.end}`)
        .sort()
        .join('|');
};

const dayMapping: { [key: string]: string } = {
    'sat': 'Saturday',
    'sun': 'Sunday',
    'mon': 'Monday',
    'tue': 'Tuesday',
    'wed': 'Wednesday',
    'thu': 'Thursday',
    'fri': 'Friday'
};

export const generateGroupName = (days: string[], timeStart: string) => {
    // e.g. "Sat/Mon 4PM"
    const validDays = days || [];
    const dayStr = validDays.map((d: string) => d.substring(0, 3).toUpperCase()).join('/');

    let timeStr = '';
    if (timeStart) {
        try {
            // Check if full date or just time
            const dateStr = timeStart.includes('T') ? timeStart : `2000-01-01T${timeStart}`;
            timeStr = format(parseISO(dateStr), 'h a');
        } catch (e) {
            timeStr = timeStart;
        }
    }

    return `${dayStr} ${timeStr}`;
};

export const syncAllStudentsToGroups = async () => {
    try {
        // 1. Fetch all students with active coaches and schedules
        // We only care if they have a coach_id and some schedule
        const { data: students, error } = await supabase
            .from('students')
            .select('*')
            .not('coach_id', 'is', null);

        if (error) throw error;
        if (!students) return { success: true, count: 0 };

        let updatedCount = 0;

        // 2. Iterate and Process
        for (const student of students) {
            // Need to parse training_schedule. It might be JSON column.
            const schedule = student.training_schedule;
            const coachId = student.coach_id;

            if (!schedule || !Array.isArray(schedule) || schedule.length === 0) continue;

            const scheduleKey = generateScheduleKey(schedule);
            const days = student.training_days || schedule.map((s: any) => s.day);
            const startTime = schedule[0]?.start;
            const groupName = generateGroupName(days, startTime);

            // 3. Find or Create Group
            // Check cache or db? We'll check DB for safety (concurrent issues unlikely for this tool)
            let { data: group } = await supabase
                .from('training_groups')
                .select('id')
                .eq('coach_id', coachId)
                .eq('schedule_key', scheduleKey)
                .maybeSingle();

            let groupId = group?.id;

            if (!groupId) {
                const { data: newGroup, error: createError } = await supabase
                    .from('training_groups')
                    .insert({
                        coach_id: coachId,
                        name: groupName,
                        schedule_key: scheduleKey
                    })
                    .select('id')
                    .single();

                if (createError) {
                    console.error('Error creating group for', student.full_name, createError);
                    continue;
                }
                groupId = newGroup.id;
            }

            // 4. Update Student if needed
            if (student.training_group_id !== groupId) {
                await supabase
                    .from('students')
                    .update({ training_group_id: groupId })
                    .eq('id', student.id);
                updatedCount++;
            }
        }

        return { success: true, count: updatedCount };

    } catch (err) {
        console.error('Sync failed:', err);
        return { success: false, error: err };
    }
};
