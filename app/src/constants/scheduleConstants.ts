/**
 * Canonical list of short day codes in display order (Saturday-first week).
 * Use this everywhere instead of hardcoding ['sat','sun',...].
 */
export const DAYS_OF_WEEK = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;
export type DayCode = typeof DAYS_OF_WEEK[number];

/**
 * Maps short day code → full English name (for DB storage / training_sessions table).
 */
export const DAY_FULL_NAMES: Record<DayCode, string> = {
    sat: 'Saturday',
    sun: 'Sunday',
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
};

/**
 * Maps long English day name → short code.
 * Used when normalising data coming back from the DB.
 */
export const DAY_NAME_TO_CODE: Record<string, DayCode> = {
    saturday: 'sat',
    sunday: 'sun',
    monday: 'mon',
    tuesday: 'tue',
    wednesday: 'wed',
    thursday: 'thu',
    friday: 'fri',
};

/**
 * Normalise any day string (full name or already-short) to a 3-letter code.
 */
export const normalizeDay = (day: string): DayCode => {
    const d = day.toLowerCase();
    return (DAY_NAME_TO_CODE[d] ?? d.substring(0, 3)) as DayCode;
};

/**
 * Normalise a time string to HH:MM format.
 */
export const normalizeTime = (time: string): string => {
    if (!time) return '16:00';
    if (time === '00' || time === '24') return '00:00';
    if (/^\d{1,2}$/.test(time)) return `${time.padStart(2, '0')}:00`;
    return time;
};

/**
 * Staff roles that are NOT coaching staff (excluded from coach dropdowns).
 */
export const NON_COACH_ROLES = ['reception', 'cleaner'] as const;

/**
 * Default training session capacity when auto-creating a session.
 */
export const DEFAULT_SESSION_CAPACITY = 20;
