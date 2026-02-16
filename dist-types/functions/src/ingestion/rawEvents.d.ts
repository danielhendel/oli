/**
 * Oli Health OS — Raw Event Ingestion (Sprint 3)
 *
 * This module defines a deterministic, typed ingestion function that:
 * - Accepts a validated IngestRawEventInput
 * - Constructs a canonical RawEvent envelope
 * - Persists it under /users/{userId}/rawEvents/{rawEventId}
 *
 * HTTP / callable / PubSub wrappers will call into this function.
 */
import { type RawEvent, type IsoDateTimeString, type HealthSourceType, type CanonicalEventKind } from "../types/health";
/**
 * Input shape used by upstream ingestion surfaces (HTTP, PubSub, etc.).
 * This is *not* stored directly; we always convert it to a RawEvent.
 */
export interface IngestRawEventInput {
    userId: string;
    sourceId: string;
    sourceType: HealthSourceType;
    provider: string;
    kind: CanonicalEventKind;
    /**
     * When the underlying event actually occurred (provider time, already normalized to UTC).
     * Example: "2025-01-01T06:30:00.000Z"
     */
    observedAt: IsoDateTimeString;
    /**
     * Provider-specific payload. Opaque at this layer.
     */
    payload: unknown;
}
/**
 * Options to control deterministic behavior for tests.
 */
export interface IngestRawEventOptions {
    /** Injected clock (default: () => new Date()) */
    now?: () => Date;
}
/**
 * Core ingestion function.
 *
 * Responsibilities:
 * - Validate basic input constraints
 * - Generate a new rawEventId
 * - Build the RawEvent according to canonical schema
 * - Persist it under /users/{userId}/rawEvents/{rawEventId}
 *
 * This is intentionally free of HTTP / auth concerns — those belong in the wrapper.
 */
export declare function ingestRawEvent(input: IngestRawEventInput, options?: IngestRawEventOptions): Promise<RawEvent>;
//# sourceMappingURL=rawEvents.d.ts.map