/**
 * Formats a class name string from the format 'CLASS=>SECTION=>SUBJECT'
 * into a more readable format.
 * @param className The raw class name string from the API.
 * @returns A formatted, human-readable class name.
 */
export const formatClassName = (className: string | undefined | null): string => {
    if (!className || className.toLowerCase() === 'null') return 'N/A';
    
    const parts = className.split('=>').map(p => p.trim());
    
    if (parts.length >= 3 && parts[0] && parts[1]) {
        // Format: 8=>A=>SOCIAL SCIENCE-089  ->  Class 8-A: SOCIAL SCIENCE-089
        return `Class ${parts[0]}-${parts[1]}: ${parts.slice(2).join(' ')}`;
    }
    
    if (parts.length === 2 && parts[0]) {
       // Format: 8=>SOCIAL SCIENCE -> Class 8: SOCIAL SCIENCE
       return `Class ${parts[0]}: ${parts[1]}`;
    }

    // Fallback for any other format
    return className;
};
