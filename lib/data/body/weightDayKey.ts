import { ymdInTimeZoneFromIso } from "@/lib/time/dayKey";

export function deriveWeightPointDayKey(
  payload: { time?: string; timezone?: string } | undefined,
  observedAt: string,
  fallbackTimeZone: string,
): string {
  return ymdInTimeZoneFromIso(
    typeof payload?.time === "string" && payload.time.length > 0 ? payload.time : observedAt,
    typeof payload?.timezone === "string" && payload.timezone.length > 0
      ? payload.timezone
      : fallbackTimeZone,
  );
}

