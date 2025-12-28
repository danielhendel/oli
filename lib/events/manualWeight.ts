// lib/events/manualWeight.ts
import type { LogWeightRequestDto } from "@/lib/contracts";

export const poundsToKg = (lbs: number): number => lbs * 0.45359237;

export const buildManualWeightPayload = (args: {
  time: string;
  timezone: string;
  weightLbs: number;
  bodyFatPercent?: number | null;
}): LogWeightRequestDto => {
  return {
    time: args.time,
    timezone: args.timezone,
    weightKg: poundsToKg(args.weightLbs),
    ...(args.bodyFatPercent !== undefined ? { bodyFatPercent: args.bodyFatPercent } : {}),
  };
};

export const manualWeightIdempotencyKey = (payload: LogWeightRequestDto): string => {
  const t = payload.time;
  const tz = payload.timezone;
  const w = payload.weightKg;
  return `mw_${t}_${tz}_${w}`.replace(/[^\w.-]/g, "_");
};
