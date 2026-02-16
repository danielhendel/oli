// services/functions/src/ingestion/rawEvents.ts
import { userRawEventsCol } from "../db/collections";
/**
 * Minimal ISO 8601 timestamp validation.
 * Ensures:
 * - string parses into a valid Date
 * - looks like an instant (contains "T")
 */
function assertIsoDateTimeString(value, fieldName) {
    if (typeof value !== "string" || !value.includes("T")) {
        throw new Error(`Invalid ${fieldName}: expected ISO datetime string, got "${value}"`);
    }
    const time = Date.parse(value);
    if (Number.isNaN(time)) {
        throw new Error(`Invalid ${fieldName}: unable to parse "${value}" as Date`);
    }
    return value;
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
export async function ingestRawEvent(input, options = {}) {
    const { userId, sourceId, sourceType, provider, kind, observedAt, payload } = input;
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
    const receivedAt = nowFn().toISOString();
    const colRef = userRawEventsCol(userId);
    const docRef = colRef.doc();
    const rawEvent = {
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
