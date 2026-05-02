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
 * - All API Firestore paths MUST begin at /users/{uid}/... except system registry paths below
 *   (e.g. system/integrations/*, system/foodGraph/*).
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

/** Global Oli Food Graph nodes (`system/foodGraph/nodes/{oliFoodId}`). Backend-only. */
export function foodGraphNodesCollection(): CollectionReference {
  return db.collection("system").doc("foodGraph").collection("nodes") as CollectionReference;
}

/** Maps external source keys (e.g. nutritionix:branded:*) → oliFoodId. */
export function foodGraphSourceMapCollection(): CollectionReference {
  return db.collection("system").doc("foodGraph").collection("sourceMap") as CollectionReference;
}

// Re-export FieldValue so routes can use serverTimestamp without importing firestore directly.
export { FieldValue };

export function userDoc(uid: string): DocumentReference {
  if (!uid) throw new Error("userDoc(uid): uid is required");
  return db.collection("users").doc(uid);
}

/** App-editable profile document at `users/{uid}/profile/main`. */
export function userProfileMainDoc(uid: string): DocumentReference {
  return userDoc(uid).collection("profile").doc("main");
}

/** Nutrition UI metadata (recents / favorites) at `users/{uid}/nutritionMeta/state`. */
export function userNutritionMetaStateDoc(uid: string): DocumentReference {
  return userDoc(uid).collection("nutritionMeta").doc("state");
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
    | "exerciseDefinitions"
    | string,
): CollectionReference<T> {
  return userDoc(uid).collection(name) as CollectionReference<T>;
}
