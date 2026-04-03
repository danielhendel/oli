// services/api/src/db.ts
import {
  getFirestore,
  FieldValue,
  FieldPath,
  type CollectionReference,
  type DocumentReference,
} from "firebase-admin/firestore";

/** FieldPath for document ID (stable pagination tiebreaker) */
export const documentIdPath = FieldPath.documentId();

/**
 * Single Firestore adapter for the Cloud Run API.
 *
 * Invariants:
 * - All API Firestore paths MUST begin at /users/{uid}/... except system registry paths below.
 * - Route files under services/api/src/routes/** must NOT import firebase-admin/firestore directly.
 *
 * This module is the only place in the API where getFirestore() is called.
 */
export const db = getFirestore();

/**
 * Registry of connected Oura users (no collectionGroup; no composite index).
 * Path: system/integrations/oura_connected/{uid}
 * Fields: { connected: true, updatedAt: serverTimestamp() }. On revoke, doc is deleted.
 */
export function ouraConnectedRegistryCollection(): CollectionReference {
  return db.collection("system").doc("integrations").collection("oura_connected") as CollectionReference;
}

export function ouraConnectedRegistryDoc(uid: string): DocumentReference {
  return ouraConnectedRegistryCollection().doc(uid);
}

// Re-export FieldValue so routes can use serverTimestamp without importing firestore directly.
export { FieldValue };

export function userDoc(uid: string): DocumentReference {
  if (!uid) throw new Error("userDoc(uid): uid is required");
  return db.collection("users").doc(uid);
}

export function userCollection<T = FirebaseFirestore.DocumentData>(
  uid: string,
  name:
    | "rawEvents"
    | "canonicalEvents"
    | "events"
    | "dailyFacts"
    | "insights"
    | "intelligenceContext"
    | string,
): CollectionReference<T> {
  return userDoc(uid).collection(name) as CollectionReference<T>;
}
