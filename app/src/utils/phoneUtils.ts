import { COUNTRIES } from '../constants/countries';

/**
 * Strips non-numeric characters except +
 */
export const cleanPhone = (value: string): string => {
    return value.replace(/[^\d+]/g, '');
};

/**
 * Formats a phone number and detects country code dynamically.
 * 
 * Logic:
 * 1. If starts with +, try to match against known dial codes.
 * 2. If starts with 00, treat it like + and try to match.
 * 3. Egyptian special: If starts with 01, auto-detect as +20.
 * 4. General match: If starts with a known dial code without +, auto-assign that code.
 */
export const formatDynamicPhone = (value: string, currentDialCode: string) => {
    let raw = cleanPhone(value);
    let newNumber = raw;
    let newCode = currentDialCode;

    // Sort countries by dial code length descending to match longest first (e.g. +971 before +9)
    const sortedCountries = [...COUNTRIES].sort((a, b) => b.dial_code.length - a.dial_code.length);

    if (raw.startsWith('+')) {
        const match = sortedCountries.find(c => raw.startsWith(c.dial_code));
        if (match) {
            newCode = match.dial_code;
            newNumber = raw.substring(match.dial_code.length);
        }
    } else if (raw.startsWith('00')) {
        const match = sortedCountries.find(c => raw.substring(2).startsWith(c.dial_code.substring(1)));
        if (match) {
            newCode = match.dial_code;
            newNumber = raw.substring(2 + match.dial_code.length - 1);
        }
    } else {
        const digits = raw;

        // Egyptian number shortcut (01...)
        if (digits.startsWith('01') && digits.length >= 2) {
            newCode = '+20';
            newNumber = digits.substring(1);
        }
        // Egyptian number with 20 prefix (201...)
        else if (digits.startsWith('201') && currentDialCode !== '+20') {
            newCode = '+20';
            newNumber = digits.substring(2);
        }
        // Generic dial code prefix (965...)
        else {
            for (const country of sortedCountries) {
                const codeDigits = country.dial_code.replace('+', '');
                if (codeDigits.length > 1 && digits.startsWith(codeDigits)) {
                    newCode = country.dial_code;
                    newNumber = digits.substring(codeDigits.length);
                    break;
                }
            }
        }
    }

    // Limit length loosely
    if (newNumber.length > 15) newNumber = newNumber.substring(0, 15);
    return { code: newCode, number: newNumber };
};
