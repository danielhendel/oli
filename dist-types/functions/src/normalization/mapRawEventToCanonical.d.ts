import type { CanonicalEvent, RawEvent } from "../types/health";
/**
 * RawEvent → CanonicalEvent mapper.
 *
 * Properties:
 * - Pure: no Firestore/Admin calls, no I/O.
 * - Deterministic: same RawEvent → same CanonicalEvent.
 * - Safe to reuse in the Reprocessing Engine.
 *
 * IMPORTANT:
 * - `day` is derived server-side from (time/start, timezone).
 * - Do NOT trust any client-provided `day`.
 */
export type MappingFailureReason = "UNSUPPORTED_PROVIDER" | "UNSUPPORTED_KIND" | "MALFORMED_PAYLOAD";
export type MappingFailure = {
    ok: false;
    reason: MappingFailureReason;
    details?: Record<string, unknown>;
};
export type MappingSuccess = {
    ok: true;
    canonical: CanonicalEvent;
};
export type MappingResult = MappingSuccess | MappingFailure;
export declare const mapRawEventToCanonical: (raw: RawEvent) => MappingResult;
//# sourceMappingURL=mapRawEventToCanonical.d.ts.map