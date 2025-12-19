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

import { getFirestore, Firestore } from "firebase-admin/firestore";
import type { CollectionReference } from "firebase-admin/firestore";

import type {
  RawEvent,
  CanonicalEvent,
  DailyFacts,
  Insight,
  UserSourceConnection
} from "../types/health";

/** Singleton Firestore instance (admin SDK init happens elsewhere) */
function db(): Firestore {
  return getFirestore();
}

// ----------------------------
// Collection Path Builders
// ----------------------------

export function userSourcesCol(userId: string): CollectionReference<UserSourceConnection> {
  return db()
    .collection("users")
    .doc(userId)
    .collection("sources") as CollectionReference<UserSourceConnection>;
}

export function userRawEventsCol(userId: string): CollectionReference<RawEvent> {
  return db()
    .collection("users")
    .doc(userId)
    .collection("rawEvents") as CollectionReference<RawEvent>;
}

export function userEventsCol(userId: string): CollectionReference<CanonicalEvent> {
  return db()
    .collection("users")
    .doc(userId)
    .collection("events") as CollectionReference<CanonicalEvent>;
}

export function userDailyFactsCol(userId: string): CollectionReference<DailyFacts> {
  return db()
    .collection("users")
    .doc(userId)
    .collection("dailyFacts") as CollectionReference<DailyFacts>;
}

export function userInsightsCol(userId: string): CollectionReference<Insight> {
  return db()
    .collection("users")
    .doc(userId)
    .collection("insights") as CollectionReference<Insight>;
}

// ----------------------------
// Document Helpers
// ----------------------------

export const userSourceDoc = (userId: string, sourceId: string) =>
  userSourcesCol(userId).doc(sourceId);

export const rawEventDoc = (userId: string, rawEventId: string) =>
  userRawEventsCol(userId).doc(rawEventId);

export const canonicalEventDoc = (userId: string, eventId: string) =>
  userEventsCol(userId).doc(eventId);

export const dailyFactsDoc = (userId: string, ymd: string) =>
  userDailyFactsCol(userId).doc(ymd);

export const insightDoc = (userId: string, insightId: string) =>
  userInsightsCol(userId).doc(insightId);
