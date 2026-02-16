/**
 * Firestore trigger:
 *   Input:  /users/{userId}/rawEvents/{rawEventId}
 *   Output: /users/{userId}/events/{canonicalEventId}
 *
 * Behavior:
 * - Maps RawEvent → CanonicalEvent via pure mapper.
 * - Logs failures (no silent drops).
 * - Avoids logging any user PII.
 */
export declare const onRawEventCreated: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    userId: string;
    rawEventId: string;
}>>;
//# sourceMappingURL=onRawEventCreated.d.ts.map