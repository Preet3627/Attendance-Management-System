// FIX: Provided full content for utils.ts to define utility functions.
/**
 * Formats a class name string from the format 'CLASS=>SECTION=>SUBJECT'
 * into a more readable format.
 * @param className The raw class name string from the API.
 * @returns A formatted, human-readable class name.
 */
export const formatClassName = (className: string | undefined | null): string => {
    if (!className || className.toLowerCase() === 'null' || className.trim() === '') return 'N/A';
    
    // Split and remove any empty strings that might result from trailing '=>'
    const parts = className.split('=>').map(p => p.trim()).filter(Boolean);
    
    if (parts.length === 0) return 'N/A';

    if (parts.length >= 2) {
        // Format: "8 => A" becomes "Class 8-A"
        return `Class ${parts[0]}-${parts[1]}`;
    }
    
    // This now handles single-part class names like "7" or "Balvatika"
    const part = parts[0];
    // If it's a string containing only digits, treat it as a standard level.
    if (/^\d+$/.test(part)) {
      return `Class ${part}`;
    }
    // Otherwise, it's a named class like "Balvatika", so return it directly.
    return part;
};

/**
 * Formats a section value which can be a string or an array of strings.
 * @param section The section data from the API.
 * @returns A comma-separated string of sections or a fallback text.
 */
export const formatSection = (section: string | string[] | null | undefined): string => {
    const fallback = 'No Section';
    if (!section) {
        return fallback;
    }
    if (Array.isArray(section)) {
        const validSections = section.filter(s => s && String(s).trim() !== '');
        return validSections.length > 0 ? validSections.join(', ') : fallback;
    }
    if (typeof section === 'string' && section.trim() !== '') {
        return section;
    }
    return fallback;
};

/**
 * Displays a value or a fallback string if the value is null, undefined, or an empty string.
 * @param value The value to display.
 * @param fallback The text to display if the value is empty.
 * @returns The value or the fallback text.
 */
export const displayWithFallback = (value: string | number | null | undefined, fallback: string = 'N/A'): string => {
    const stringValue = String(value ?? '').trim();
    if (stringValue === '' || stringValue.toLowerCase() === 'null') {
        return fallback;
    }
    return stringValue;
};
