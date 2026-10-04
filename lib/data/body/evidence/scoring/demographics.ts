/**
 * Score-layer demographics helpers.
 */

import type { BodyCompositionScoreSex } from "@oli/contracts";

export function parseScoreSex(sexAtBirth: unknown): BodyCompositionScoreSex | null {
  if (sexAtBirth === "male" || sexAtBirth === "female") return sexAtBirth;
  return null;
}

export function parseSubjectHeightCm(height: {
  valueCm: number | null;
} | null | undefined): number | null {
  if (height?.valueCm == null) return null;
  if (!Number.isFinite(height.valueCm) || height.valueCm <= 0) return null;
  return height.valueCm;
}
