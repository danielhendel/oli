// services/api/src/lib/dayKey.ts

export const ymdInTimeZoneFromIso = (iso: string, timeZone: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return toYmdUtc(new Date());
    }
  
    try {
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return fmt.format(d);
    } catch {
      return toYmdUtc(d);
    }
  };
  
  const toYmdUtc = (date: Date): string => {
    const yyyy = String(date.getUTCFullYear()).padStart(4, "0");
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  