/**
 * Realtime "golden path" recompute.
 *
 * Trigger:
 * - On create of /users/{userId}/events/{eventId}
 *
 * Writes:
 * - /users/{userId}/dailyFacts/{day}
 * - /users/{userId}/insights/{insightId}
 * - /users/{userId}/intelligenceContext/{day}
 */
export declare const onCanonicalEventCreated: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    userId: string;
    eventId: string;
}>>;
