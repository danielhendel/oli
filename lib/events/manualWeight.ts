// lib/events/manualWeight.ts

import { getTodayDayKey } from "../time/dayKey";
import { getLocalTimeZone } from "../time/timezone";

export type ManualWeightPayload = {
  time: string; // ISO
  day: string; // YYYY-MM-DD
  timezone: string; // IANA
  weightKg: number;
  bodyFatPercent?: number | null;
};

const round = (v: number, digits: number): number => {
  const p = 10 ** digits;
  return Math.round(v * p) / p;
};

export const poundsToKg = (lb: number): number => round(lb * 0.45359237, 3);

export const buildManualWeightPayload = (input: {
  weightKg: number;
  bodyFatPercent?: number | null;
  time?: Date;
}): ManualWeightPayload => {
  const time = input.time ?? new Date();
  return {
    time: time.toISOString(),
    day: getTodayDayKey(),
    timezone: getLocalTimeZone(),
    weightKg: round(input.weightKg, 3),
    ...(input.bodyFatPercent !== undefined ? { bodyFatPercent: input.bodyFatPercent } : {}),
  };
};
