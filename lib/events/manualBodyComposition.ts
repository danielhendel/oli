/**
 * Manual body_composition ingest builders (Body Fat % / Lean Mass).
 * Routes through the existing POST /ingest front door — no second pipeline.
 */
import type { z } from "zod";

import { rawEventPayloadByKindSchemas } from "@/lib/contracts";

export type ManualBodyCompositionPayload = z.infer<
  (typeof rawEventPayloadByKindSchemas)["body_composition"]
>;

export type ManualBodyCompositionMetric = "bodyFatPercent" | "leanBodyMassKg";

const roundMetric = (value: number): number => Math.round(value * 10_000) / 10_000;

export const poundsToKg = (lbs: number): number => lbs * 0.45359237;

export function buildManualBodyFatPercentPayload(args: {
  time: string;
  timezone: string;
  bodyFatPercent: number;
}): ManualBodyCompositionPayload {
  return {
    time: args.time,
    timezone: args.timezone,
    bodyFatPercent: roundMetric(args.bodyFatPercent),
  };
}

export function buildManualLeanBodyMassPayload(args: {
  time: string;
  timezone: string;
  leanBodyMassLbs: number;
}): ManualBodyCompositionPayload {
  return {
    time: args.time,
    timezone: args.timezone,
    leanBodyMassKg: roundMetric(poundsToKg(args.leanBodyMassLbs)),
  };
}

export function manualBodyCompositionIdempotencyKey(
  payload: ManualBodyCompositionPayload,
  metric: ManualBodyCompositionMetric,
): string {
  const value =
    metric === "bodyFatPercent"
      ? payload.bodyFatPercent
      : payload.leanBodyMassKg;
  const rounded =
    typeof value === "number" && Number.isFinite(value) ? roundMetric(value) : "na";
  return `mbc_${metric}_${payload.time}_${payload.timezone}_${rounded}`.replace(
    /[^\w.-]/g,
    "_",
  );
}
