/**
 * Standardized Waist measurement protocol (WHO midpoint).
 *
 * Oli manual capture always uses who_midpoint_v1.
 * Imported / unknown-method waist may use protocolId "unknown".
 */

export const WHO_MIDPOINT_PROTOCOL_ID = "who_midpoint_v1" as const;
export const WHO_MIDPOINT_PROTOCOL_VERSION = 1 as const;

export type WaistProtocolId = typeof WHO_MIDPOINT_PROTOCOL_ID | "unknown";

/** Consumer-facing measurement instructions (WHO midpoint). */
export const WHO_MIDPOINT_HOW_TO_MEASURE =
  "Measure midway between the bottom of your ribs and the top of your hip bone. Keep the tape level and snug without compressing your skin. Measure after a normal breath out.";

export const WHO_MIDPOINT_CONDITIONS = [
  "Standing",
  "Abdomen relaxed",
  "Midpoint between lowest palpable rib and top of iliac crest",
  "Tape horizontal",
  "Snug, not compressing",
  "End of a normal expiration",
] as const;

/** Exact inch → centimetre factor (canonical storage is always cm). */
export const INCHES_PER_CM = 1 / 2.54;
export const CM_PER_INCH = 2.54;

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export function cmToInches(cm: number): number {
  return cm * INCHES_PER_CM;
}

/** Round for idempotency / display helpers — does not alter source observation math. */
export function roundWaistCm(cm: number): number {
  return Math.round(cm * 10_000) / 10_000;
}
