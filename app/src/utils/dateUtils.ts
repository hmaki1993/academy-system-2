import { parseISO, addMonths, format } from 'date-fns';

/**
 * Calculate age in years from a birth date string (yyyy-MM-dd).
 * Single source of truth — imported everywhere instead of being duplicated.
 */
export const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

/**
 * Calculate subscription expiry date from a start date and plan duration.
 * @param start - ISO date string (yyyy-MM-dd)
 * @param durationMonths - Number of months the plan lasts
 */
export const calculateExpiry = (start: string, durationMonths: number): string => {
    if (!start) return format(addMonths(new Date(), durationMonths || 1), 'yyyy-MM-dd');
    const date = parseISO(start);
    return format(addMonths(date, durationMonths || 1), 'yyyy-MM-dd');
};

/**
 * Format seconds into a human-readable HH:MM:SS string.
 */
export const formatSeconds = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
};

/**
 * Calculate elapsed seconds between two ISO datetime strings.
 */
export const calcElapsedSeconds = (startIso: string, endIso?: string): number => {
    const start = new Date(startIso).getTime();
    const end = endIso ? new Date(endIso).getTime() : Date.now();
    return Math.floor((end - start) / 1000);
};
