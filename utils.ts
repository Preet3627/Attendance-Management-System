// FIX: Provided full content for utils.ts to define utility functions.
/**
 * Formats a class name string from the format 'CLASS=>SECTION=>SUBJECT'
 * into a more readable format.
 * @param className The raw class name string from the API.
 * @returns A formatted, human-readable class name.
 */
export const formatClassName = (className: string | undefined | null): string => {
    if (!className || className.toLowerCase() === 'null') return 'N/A';
    
    const parts = className.split('=>').map(p => p.trim());
    
    if (parts.length >= 2 && parts[0] && parts[1]) {
        // Format: 8=>A=>SUBJECT  ->  Class 8-A
        return `Class ${parts[0]}-${parts[1]}`;
    }
    
    if (parts.length === 1 && parts[0]) {
       // Format: 8 -> Class 8
       return `Class ${parts[0]}`;
    }

    // Fallback for any other format
    return className.split('=>')[0] || 'N/A';
};
