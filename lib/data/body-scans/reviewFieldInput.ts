/**
 * Review input parsing for Body Scan confirmation (pure).
 *
 * Two rules drive everything here: an empty field means "not in my report" (missing, not
 * zero), and a value the user cannot vouch for is never confirmed on their behalf.
 */

import type { BodyScanFieldCorrectionDto, BodyScanReviewFieldDto } from "@oli/contracts";
import {
  bodyScanDisplayValuesEquivalent,
  formatBodyScanConsumerDisplayValue,
  formatBodyScanReportShowsText,
} from "./bodyScanDisplayFormat";

export type BodyScanReviewFieldInput = {
  /** Raw text as typed. Empty string means the user marked the value as missing. */
  text: string;
  acknowledged: boolean;
};

export type BodyScanReviewInputState = Record<string, BodyScanReviewFieldInput>;

export type ParsedReviewValue =
  | { ok: true; value: number | null }
  | { ok: false; reason: "not_a_number" | "negative" };

/** Editable canonical value — consumer display precision, not full float noise. */
export function formatReviewFieldValue(field: BodyScanReviewFieldDto): string {
  if (field.normalizedValue == null) return "";
  return formatBodyScanConsumerDisplayValue(field.normalizedValue, field.unit);
}

/** Source-reported copy for the "Report shows" line (never the canonical unit alone). */
export function formatReviewReportShows(field: BodyScanReviewFieldDto): string {
  return formatBodyScanReportShowsText(field.rawValue);
}

export function initialReviewInputState(
  fields: readonly BodyScanReviewFieldDto[],
): BodyScanReviewInputState {
  const state: BodyScanReviewInputState = {};
  for (const field of fields) {
    state[field.fieldId] = {
      text: formatReviewFieldValue(field),
      // A field flagged for review starts unacknowledged: the user must look at it.
      acknowledged: !field.requiresReview,
    };
  }
  return state;
}

export function parseReviewFieldValue(text: string): ParsedReviewValue {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return { ok: false, reason: "not_a_number" };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { ok: false, reason: "not_a_number" };
  if (value < 0) return { ok: false, reason: "negative" };
  return { ok: true, value };
}

export function reviewFieldErrorMessage(reason: "not_a_number" | "negative"): string {
  return reason === "negative"
    ? "Enter a value of zero or more, or clear the field if your report does not show it."
    : "Enter the number exactly as it appears on your report, or clear the field.";
}

/** Field ids the user still has to look at before confirmation is allowed. */
export function unacknowledgedReviewFieldIds(
  fields: readonly BodyScanReviewFieldDto[],
  state: BodyScanReviewInputState,
): string[] {
  return fields
    .filter((field) => field.requiresReview && state[field.fieldId]?.acknowledged !== true)
    .map((field) => field.fieldId);
}

export type BuiltReviewSubmission =
  | { ok: true; corrections: BodyScanFieldCorrectionDto[]; acknowledgedFieldIds: string[] }
  | { ok: false; invalidFieldIds: string[]; unacknowledgedFieldIds: string[] };

export function buildReviewSubmission(
  fields: readonly BodyScanReviewFieldDto[],
  state: BodyScanReviewInputState,
): BuiltReviewSubmission {
  const corrections: BodyScanFieldCorrectionDto[] = [];
  const acknowledgedFieldIds: string[] = [];
  const invalidFieldIds: string[] = [];

  for (const field of fields) {
    const input = state[field.fieldId];
    if (!input) continue;
    if (input.acknowledged) acknowledgedFieldIds.push(field.fieldId);

    const parsed = parseReviewFieldValue(input.text);
    if (!parsed.ok) {
      invalidFieldIds.push(field.fieldId);
      continue;
    }
    // Display-rounded edits that match the shown value are not corrections — keep canonical.
    if (parsed.value !== field.normalizedValue) {
      const displayOnly =
        parsed.value != null &&
        field.normalizedValue != null &&
        bodyScanDisplayValuesEquivalent(parsed.value, field.normalizedValue, field.unit);
      if (!displayOnly) {
        corrections.push({ fieldId: field.fieldId, value: parsed.value });
      }
    }
  }

  const unacknowledgedFieldIds = unacknowledgedReviewFieldIds(fields, state);
  if (invalidFieldIds.length > 0 || unacknowledgedFieldIds.length > 0) {
    return { ok: false, invalidFieldIds, unacknowledgedFieldIds };
  }
  return { ok: true, corrections, acknowledgedFieldIds };
}
