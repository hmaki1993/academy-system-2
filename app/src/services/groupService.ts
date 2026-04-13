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
        console.log('🚀 Calling sync_students_to_groups_rpc...');
        const { data, error } = await supabase.rpc('sync_students_to_groups_rpc');

        if (error) throw error;

        return { 
            success: true, 
            count: data?.updated_count || 0 
        };

    } catch (err) {
        console.error('Sync failed:', err);
        return { success: false, error: err };
    }
};
