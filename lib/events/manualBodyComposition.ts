/**
 * Manual body_composition ingest builders (Body Fat % / Lean Mass / Waist).
 * Routes through the existing POST /ingest front door — no second pipeline.
 */
import type { z } from "zod";

import {
  CM_PER_INCH,
  WHO_MIDPOINT_PROTOCOL_ID,
  WHO_MIDPOINT_PROTOCOL_VERSION,
  roundWaistCm,
} from "@/lib/body/waistProtocol";
import { rawEventPayloadByKindSchemas } from "@/lib/contracts";

export type ManualBodyCompositionPayload = z.infer<
  (typeof rawEventPayloadByKindSchemas)["body_composition"]
>;

export type ManualBodyCompositionMetric =
  | "bodyFatPercent"
  | "leanBodyMassKg"
  | "waistCircumferenceCm";

export {
  WHO_MIDPOINT_PROTOCOL_ID,
  WHO_MIDPOINT_PROTOCOL_VERSION,
} from "@/lib/body/waistProtocol";

const roundMetric = (value: number): number => Math.round(value * 10_000) / 10_000;

export const poundsToKg = (lbs: number): number => lbs * 0.45359237;

export const inchesToCm = (inches: number): number => inches * CM_PER_INCH;

export const cmToInches = (cm: number): number => cm / CM_PER_INCH;

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

export function buildManualWaistCircumferencePayload(args: {
  time: string;
  timezone: string;
  waistCircumferenceCm: number;
}): ManualBodyCompositionPayload {
  return {
    time: args.time,
    timezone: args.timezone,
    waistCircumferenceCm: roundWaistCm(args.waistCircumferenceCm),
    protocolId: WHO_MIDPOINT_PROTOCOL_ID,
    protocolVersion: WHO_MIDPOINT_PROTOCOL_VERSION,
  };
}

export function manualBodyCompositionIdempotencyKey(
  payload: ManualBodyCompositionPayload,
  metric: ManualBodyCompositionMetric,
): string {
  const value =
    metric === "bodyFatPercent"
      ? payload.bodyFatPercent
      : metric === "leanBodyMassKg"
        ? payload.leanBodyMassKg
        : payload.waistCircumferenceCm;
  const rounded =
    typeof value === "number" && Number.isFinite(value) ? roundMetric(value) : "na";
  return `mbc_${metric}_${payload.time}_${payload.timezone}_${rounded}`.replace(
    /[^\w.-]/g,
    "_",
  );
}
