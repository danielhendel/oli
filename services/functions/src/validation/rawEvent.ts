// services/functions/src/validation/rawEvent.ts

import type { RawEvent } from "../types/health";
import { rawEventDocSchema } from "@oli/contracts";

/**
 * Backwards-compatible parser result for existing pipeline callers.
 * (Your code expects `parsed.value`.)
 */
export type ParseRawEventResult =
  | { ok: true; value: RawEvent }
  | { ok: false; reason: "INVALID_RAW_EVENT_CONTRACT"; issues: unknown };

/**
 * Contract-first validation:
 * - Validates raw Firestore doc against authoritative schema
 * - Prevents drift/corruption
 */
export const parseRawEventContract = (data: unknown) => {
  const parsed = rawEventDocSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false as const, issues: parsed.error.flatten() };
  }
  return { ok: true as const, data: parsed.data };
};

/**
 * ✅ Compatibility wrapper used throughout the functions pipeline.
 * Keeps the rest of the pipeline unchanged while enforcing the contract.
 */
export const parseRawEvent = (data: unknown): ParseRawEventResult => {
  const contract = parseRawEventContract(data);
  if (!contract.ok) {
    return { ok: false, reason: "INVALID_RAW_EVENT_CONTRACT", issues: contract.issues };
  }

  return { ok: true, value: contract.data as RawEvent };
};
