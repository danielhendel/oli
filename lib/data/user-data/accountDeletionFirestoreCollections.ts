/**
 * User-scoped Firestore subcollections removed by the account deletion worker.
 * Shared between Functions executor and CI coverage assertions.
 */

import { DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS } from "../documents/documentAccountLifecycle";

/** Core health, integration, nutrition, workout, and account-control subcollections. */
export const ACCOUNT_DELETION_CORE_FIRESTORE_COLLECTIONS = [
  "profile",
  "exerciseDefinitions",
  "rawEvents",
  "rawEventIngestSuppressions",
  "events",
  "dailyFacts",
  "sleepNights",
  "ouraVendorSleep",
  "ouraVendorReadiness",
  "ouraVendorStress",
  "integrations",
  "oauthStates",
  "integrationLocks",
  "workoutDaySummaries",
  "workoutMonthSummaries",
  "meals",
  "pantry",
  "nutritionMeta",
  "insights",
  "intelligenceContext",
  "healthScores",
  "healthSignals",
  "failures",
  "derivedLedger",
  "sources",
  "ingestionDedupe",
  "integrityViolations",
  "accountExports",
  "accountDeletion",
] as const;

export type AccountDeletionCoreFirestoreCollection =
  (typeof ACCOUNT_DELETION_CORE_FIRESTORE_COLLECTIONS)[number];

/** Full list passed to recursiveDelete under users/{uid}. */
export const ACCOUNT_DELETION_FIRESTORE_COLLECTIONS = [
  ...ACCOUNT_DELETION_CORE_FIRESTORE_COLLECTIONS,
  ...DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS,
] as const;

export type AccountDeletionFirestoreCollection =
  (typeof ACCOUNT_DELETION_FIRESTORE_COLLECTIONS)[number];

/** App storage prefixes removed on account delete (not exports bucket). */
export function accountDeletionAppStoragePrefixes(uid: string): readonly string[] {
  return [`users/${uid}/documents/`, `lab-uploads/${uid}/`, `uploads/${uid}/`];
}

/** Exports bucket prefix for generated ZIP artifacts. */
export function accountDeletionExportStoragePrefix(uid: string): string {
  return `exports/${uid}/`;
}

/** Global export lifecycle doc id (accountExports/{uid_requestId}). */
export function globalAccountExportDocId(uid: string, requestId: string): string {
  return `${uid}_${requestId}`.replace(/\//g, "_");
}

/** Global deletion lifecycle doc id (accountDeletions/{uid_requestId}). */
export function globalAccountDeletionDocId(uid: string, requestId: string): string {
  return `${uid}_${requestId}`.replace(/\//g, "_");
}
