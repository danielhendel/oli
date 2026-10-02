/**
 * Validation helpers for Body Composition evidence observations (pure).
 */

import type {
  BodyCompositionEvidenceInvalidReason,
  BodyCompositionEvidenceObservation,
  BodyCompositionEvidenceUnit,
} from "@oli/contracts";

export type EvidenceValidationResult =
  | { ok: true; observation: BodyCompositionEvidenceObservation }
  | { ok: false; reason: BodyCompositionEvidenceInvalidReason };

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateEvidenceValue(args: {
  value: number;
  unit: BodyCompositionEvidenceUnit;
  measuredAt: string | null | undefined;
}): BodyCompositionEvidenceInvalidReason | null {
  if (!isFiniteNumber(args.value)) return "nan_or_infinite";
  if (!args.measuredAt || !String(args.measuredAt).trim()) return "invalid_measured_at";
  const t = Date.parse(args.measuredAt);
  if (Number.isNaN(t) && !/^\d{4}-\d{2}-\d{2}/.test(args.measuredAt)) return "invalid_measured_at";

  switch (args.unit) {
    case "kg":
    case "lb":
    case "g":
      if (args.value < 0) return "negative_mass";
      break;
    case "cm":
      if (args.value <= 0) return "negative_length";
      break;
    case "percent":
      if (args.value < 0 || args.value > 100) return "invalid_percent";
      break;
    default:
      break;
  }
  return null;
}

/**
 * Normalize body-fat percent representations without double-scaling.
 * Values in (0, 1] that look like fractions are expanded once to percent.
 * Values already in percent (typical DXA 17.7) are left alone.
 */
export function normalizeEvidenceBodyFatPercent(raw: number): number | null {
  if (!isFiniteNumber(raw) || raw < 0) return null;
  if (raw === 0) return 0;
  if (raw > 0 && raw <= 1) return raw * 100;
  if (raw > 100) return null;
  return raw;
}
