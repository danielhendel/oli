/**
 * P0 data-lifecycle disposition for every durable store (Stage 1C).
 * CI asserts no UNKNOWN/BLOCKED P0 entries without approved classification.
 */

import type { UserDataRetentionPathId } from "./userDataRetentionRegistry";

export type LifecycleDisposition =
  | "EXPORTED_AND_DELETED"
  | "DELETED_NOT_EXPORTED"
  | "EXPORTED_NOT_DELETED"
  | "LEGALLY_RETAINED"
  | "DERIVED_RECOMPUTABLE"
  | "NOT_APPLICABLE"
  | "BLOCKED";

export type LifecycleClassificationEntry = {
  pathId: UserDataRetentionPathId;
  disposition: LifecycleDisposition;
  /** Safe consumer-facing rationale — no paths or identifiers. */
  rationale: string;
};

export const USER_DATA_LIFECYCLE_CLASSIFICATION: Record<
  UserDataRetentionPathId,
  LifecycleClassificationEntry
> = {
  user_root: {
    pathId: "user_root",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "User root document deleted with account subtree.",
  },
  profile_general: {
    pathId: "profile_general",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Profile exported and deleted with account.",
  },
  profile_main: {
    pathId: "profile_main",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Profile exported and deleted with account.",
  },
  preferences_field: {
    pathId: "preferences_field",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Preferences on user root deleted; export gap tracked separately.",
  },
  raw_events: {
    pathId: "raw_events",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Raw events exported and deleted.",
  },
  raw_event_ingest_suppressions: {
    pathId: "raw_event_ingest_suppressions",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Operational suppressions deleted; not exported.",
  },
  events: {
    pathId: "events",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Canonical events exported and deleted.",
  },
  daily_facts: {
    pathId: "daily_facts",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Daily facts exported and deleted.",
  },
  sleep_nights: {
    pathId: "sleep_nights",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Sleep nights deleted; export coverage gap remains open.",
  },
  oura_vendor_sleep: {
    pathId: "oura_vendor_sleep",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Oura vendor mirror deleted; export gap remains open.",
  },
  oura_vendor_readiness: {
    pathId: "oura_vendor_readiness",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Oura vendor mirror deleted; export gap remains open.",
  },
  oura_vendor_stress: {
    pathId: "oura_vendor_stress",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Oura vendor mirror deleted; export gap remains open.",
  },
  integrations: {
    pathId: "integrations",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Integration records and tokens deleted; never exported.",
  },
  oauth_states: {
    pathId: "oauth_states",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Ephemeral OAuth state deleted.",
  },
  integration_locks: {
    pathId: "integration_locks",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Operational locks deleted.",
  },
  workout_day_summaries: {
    pathId: "workout_day_summaries",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Workout summaries deleted; export gap remains open.",
  },
  workout_month_summaries: {
    pathId: "workout_month_summaries",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Workout summaries deleted; export gap remains open.",
  },
  exercise_definitions: {
    pathId: "exercise_definitions",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Exercise definitions deleted; export gap remains open.",
  },
  meals: {
    pathId: "meals",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Nutrition meals deleted; export gap remains open.",
  },
  pantry: {
    pathId: "pantry",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Pantry items deleted; export gap remains open.",
  },
  nutrition_meta: {
    pathId: "nutrition_meta",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Nutrition meta deleted; export gap remains open.",
  },
  lab_uploads: {
    pathId: "lab_uploads",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Lab uploads exported and deleted.",
  },
  lab_results: {
    pathId: "lab_results",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Lab results deleted with document collections.",
  },
  lab_extraction_drafts: {
    pathId: "lab_extraction_drafts",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Lab drafts exported and deleted.",
  },
  lab_reviews: {
    pathId: "lab_reviews",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Lab reviews exported and deleted.",
  },
  lab_accepted_results: {
    pathId: "lab_accepted_results",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Accepted lab results exported and deleted.",
  },
  insights: {
    pathId: "insights",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Insights exported and deleted.",
  },
  intelligence_context: {
    pathId: "intelligence_context",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Intelligence context exported and deleted.",
  },
  health_scores: {
    pathId: "health_scores",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Health scores exported and deleted.",
  },
  health_signals: {
    pathId: "health_signals",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Health signals exported and deleted.",
  },
  failures: {
    pathId: "failures",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Operational failure records deleted.",
  },
  derived_ledger: {
    pathId: "derived_ledger",
    disposition: "DERIVED_RECOMPUTABLE",
    rationale: "Pipeline ledger deleted; derived from source events.",
  },
  sources: {
    pathId: "sources",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Legacy source config deleted.",
  },
  ingestion_dedupe: {
    pathId: "ingestion_dedupe",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Dedupe keys deleted.",
  },
  integrity_violations: {
    pathId: "integrity_violations",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Integrity records deleted.",
  },
  account_exports_user: {
    pathId: "account_exports_user",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Export request mirror deleted with account.",
  },
  account_exports_global: {
    pathId: "account_exports_global",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Global export lifecycle docs and artifacts removed on delete.",
  },
  account_deletions_global: {
    pathId: "account_deletions_global",
    disposition: "LEGALLY_RETAINED",
    rationale: "Sanitized deletion audit retained outside user subtree for retry observability.",
  },
  storage_lab_uploads: {
    pathId: "storage_lab_uploads",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Lab upload objects exported and deleted.",
  },
  storage_generic_uploads: {
    pathId: "storage_generic_uploads",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Generic upload objects deleted; export gap remains open.",
  },
  storage_document_originals: {
    pathId: "storage_document_originals",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Document originals exported and deleted.",
  },
  user_documents: {
    pathId: "user_documents",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Document metadata exported and deleted.",
  },
  document_ingestion_jobs: {
    pathId: "document_ingestion_jobs",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Ingestion jobs exported and deleted.",
  },
  document_extractions: {
    pathId: "document_extractions",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Extractions exported and deleted.",
  },
  storage_exports: {
    pathId: "storage_exports",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "Generated export ZIP artifacts deleted on account delete.",
  },
  system_oura_connected: {
    pathId: "system_oura_connected",
    disposition: "DELETED_NOT_EXPORTED",
    rationale: "System Oura registry entry removed on delete.",
  },
  withings_historical_raw_events: {
    pathId: "withings_historical_raw_events",
    disposition: "EXPORTED_AND_DELETED",
    rationale: "Withings raw events covered by rawEvents export/delete.",
  },
  medications_placeholder: {
    pathId: "medications_placeholder",
    disposition: "NOT_APPLICABLE",
    rationale: "No durable store implemented.",
  },
  supplements_placeholder: {
    pathId: "supplements_placeholder",
    disposition: "NOT_APPLICABLE",
    rationale: "No durable store implemented.",
  },
  medical_history_placeholder: {
    pathId: "medical_history_placeholder",
    disposition: "NOT_APPLICABLE",
    rationale: "No durable store implemented.",
  },
  scans_placeholder: {
    pathId: "scans_placeholder",
    disposition: "NOT_APPLICABLE",
    rationale: "No durable store implemented.",
  },
  dna_placeholder: {
    pathId: "dna_placeholder",
    disposition: "NOT_APPLICABLE",
    rationale: "No durable store implemented.",
  },
};

export function listLifecycleClassifications(): readonly LifecycleClassificationEntry[] {
  return Object.values(USER_DATA_LIFECYCLE_CLASSIFICATION);
}

export function countBlockedOrUnknownP0(): number {
  return listLifecycleClassifications().filter((e) => e.disposition === "BLOCKED").length;
}

export function assertLifecycleCoverageComplete(): void {
  const blocked = listLifecycleClassifications().filter((e) => e.disposition === "BLOCKED");
  if (blocked.length > 0) {
    throw new Error(
      `P0 lifecycle coverage blocked for: ${blocked.map((b) => b.pathId).join(", ")}`,
    );
  }
}
