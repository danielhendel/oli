// services/functions/src/ingestion/rawEvents.ts

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

import {
    type RawEvent,
    type IsoDateTimeString,
    type HealthSourceType,
    type CanonicalEventKind
  } from "../types/health";
  import { userRawEventsCol } from "../db/collections";
  
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
   * Minimal ISO 8601 timestamp validation.
   * Ensures:
   * - string parses into a valid Date
   * - looks like an instant (contains "T")
   */
  function assertIsoDateTimeString(value: string, fieldName: string): IsoDateTimeString {
    if (typeof value !== "string" || !value.includes("T")) {
      throw new Error(`Invalid ${fieldName}: expected ISO datetime string, got "${value}"`);
    }
  
    const time = Date.parse(value);
    if (Number.isNaN(time)) {
      throw new Error(`Invalid ${fieldName}: unable to parse "${value}" as Date`);
    }
  
    return value as IsoDateTimeString;
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
  export async function ingestRawEvent(
    input: IngestRawEventInput,
    options: IngestRawEventOptions = {}
  ): Promise<RawEvent> {
    const {
      userId,
      sourceId,
      sourceType,
      provider,
      kind,
      observedAt,
      payload
    } = input;
  
    if (!userId || typeof userId !== "string") {
      throw new Error("userId is required");
    }
  
    if (!sourceId || typeof sourceId !== "string") {
      throw new Error("sourceId is required");
    }
  
    if (!provider || typeof provider !== "string") {
      throw new Error("provider is required");
    }
  
    const validatedObservedAt = assertIsoDateTimeString(observedAt, "observedAt");
  
    const nowFn = options.now ?? (() => new Date());
    const receivedAt = nowFn().toISOString() as IsoDateTimeString;
  
    const colRef = userRawEventsCol(userId);
    const docRef = colRef.doc();
  
    const rawEvent: RawEvent = {
      id: docRef.id,
      userId,
      sourceId,
      sourceType,
      provider,
      kind,
      receivedAt,
      observedAt: validatedObservedAt,
      payload,
      schemaVersion: 1
    };
  
    await docRef.set(rawEvent);
  
    return rawEvent;
  }
  