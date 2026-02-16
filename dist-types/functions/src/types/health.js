// services/functions/src/types/health.ts
/**
 * Narrow helper utilities — lightweight runtime guards
 * to keep pipeline transitions type-safe.
 */
/** Returns true if the given string matches YYYY-MM-DD. */
export function isYmdDateString(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
/**
 * Type guard to distinguish CanonicalEvent from RawEvent based on
 * the presence of canonical-only fields.
 */
export function isCanonicalEvent(event) {
    const candidate = event;
    return (typeof candidate.kind === 'string' &&
        typeof candidate.start === 'string');
}
/** Minimal runtime check for DailyFacts shape */
export function isDailyFacts(value) {
    if (!value || typeof value !== 'object')
        return false;
    const candidate = value;
    return typeof candidate.userId === 'string' && typeof candidate.date === 'string';
}
