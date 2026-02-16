import type { RawEvent } from "../types/health";
/**
 * Backwards-compatible parser result for existing pipeline callers.
 * (Your code expects `parsed.value`.)
 */
export type ParseRawEventResult = {
    ok: true;
    value: RawEvent;
} | {
    ok: false;
    reason: "INVALID_RAW_EVENT_CONTRACT";
    issues: unknown;
};
/**
 * Contract-first validation:
 * - Validates raw Firestore doc against authoritative schema
 * - Prevents drift/corruption
 */
export declare const parseRawEventContract: (data: unknown) => {
    ok: false;
    issues: import("zod").typeToFlattenedError<{
        kind: "sleep" | "steps" | "workout" | "weight" | "hrv";
        schemaVersion: 1;
        userId: string;
        id: string;
        sourceId: string;
        provider: string;
        sourceType: string;
        receivedAt: string;
        observedAt: string;
        payload?: unknown;
    }, string>;
    data?: never;
} | {
    ok: true;
    data: {
        kind: "sleep" | "steps" | "workout" | "weight" | "hrv";
        schemaVersion: 1;
        userId: string;
        id: string;
        sourceId: string;
        provider: string;
        sourceType: string;
        receivedAt: string;
        observedAt: string;
        payload?: unknown;
    };
    issues?: never;
};
/**
 * ✅ Compatibility wrapper used throughout the functions pipeline.
 * Keeps the rest of the pipeline unchanged while enforcing the contract.
 */
export declare const parseRawEvent: (data: unknown) => ParseRawEventResult;
