// lib/time/dayKey.ts

/**
 * Returns YYYY-MM-DD in the user's local timezone.
 * NOTE: This is “good enough” for Sprint 7. We'll later lock a canonical timezone policy.
 */
export const getTodayDayKey = (): string => {
    const d = new Date();
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  