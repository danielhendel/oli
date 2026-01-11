// lib/events/manualWeight.ts
import type { LogWeightRequestDto } from "@/lib/contracts";

export const poundsToKg = (lbs: number): number => lbs * 0.45359237;

/**
 * Round to 4 decimals to keep idempotency stable across platforms
 * while preserving more than enough precision for body weight.
 */
const roundKg = (kg: number): number => Math.round(kg * 10_000) / 10_000;

export const buildManualWeightPayload = (args: {
  time: string;
  timezone: string;
  weightLbs: number;
  bodyFatPercent?: number | null;
}): LogWeightRequestDto => {
  const weightKg = roundKg(poundsToKg(args.weightLbs));

  return {
    time: args.time,
    timezone: args.timezone,
    weightKg,
    ...(args.bodyFatPercent !== undefined ? { bodyFatPercent: args.bodyFatPercent } : {}),
  };
};

export const manualWeightIdempotencyKey = (payload: LogWeightRequestDto): string => {
  // Keep it deterministic and short-ish.
  // Use rounded kg to avoid float string differences.
  const t = payload.time;
  const tz = payload.timezone;
  const w = roundKg(payload.weightKg);

  return `mw_${t}_${tz}_${w}`.replace(/[^\w.-]/g, "_");
};
