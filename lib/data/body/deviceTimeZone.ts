/** IANA timezone for Body snapshot / day-key derivation (device calendar). */
export function getDeviceTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}
