export function canonicalDayKey(
    observedAt: string,
    timeZone: string
  ): string {
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", { timeZone });
      return formatter.format(new Date(observedAt));
    } catch {
      throw new Error("INVALID_TIMEZONE");
    }
  }