// services/functions/src/db/collections.ts
/**
 * Firestore typed collection + doc builders for the Oli Health OS.
 *
 * These helpers:
 * - Enforce correct Firestore document paths
 * - Enforce canonical schema types
 * - Wrap Firebase Admin SDK access in a safe, typed API
 *
 * This file is used across ingestion, normalization, analytics, and insights.
 */
import { getFirestore } from "firebase-admin/firestore";
/** Singleton Firestore instance (admin SDK init happens elsewhere) */
function db() {
    return getFirestore();
}
// ----------------------------
// Collection Path Builders
// ----------------------------
export function userSourcesCol(userId) {
    return db()
        .collection("users")
        .doc(userId)
        .collection("sources");
}
export function userRawEventsCol(userId) {
    return db()
        .collection("users")
        .doc(userId)
        .collection("rawEvents");
}
export function userEventsCol(userId) {
    return db()
        .collection("users")
        .doc(userId)
        .collection("events");
}
export function userDailyFactsCol(userId) {
    return db()
        .collection("users")
        .doc(userId)
        .collection("dailyFacts");
}
export function userInsightsCol(userId) {
    return db()
        .collection("users")
        .doc(userId)
        .collection("insights");
}
// ----------------------------
// Document Helpers
// ----------------------------
export const userSourceDoc = (userId, sourceId) => userSourcesCol(userId).doc(sourceId);
export const rawEventDoc = (userId, rawEventId) => userRawEventsCol(userId).doc(rawEventId);
export const canonicalEventDoc = (userId, eventId) => userEventsCol(userId).doc(eventId);
export const dailyFactsDoc = (userId, ymd) => userDailyFactsCol(userId).doc(ymd);
export const insightDoc = (userId, insightId) => userInsightsCol(userId).doc(insightId);
