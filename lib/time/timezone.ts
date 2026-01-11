// lib/time/timezone.ts

/**
 * Best-effort local IANA timezone name.
 * Falls back to "UTC" if the runtime cannot resolve.
 */
export const getLocalTimeZone = (): string => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return typeof tz === "string" && tz.length > 0 ? tz : "UTC";
    } catch {
      return "UTC";
    }
  };
  