/**
 * Versioned Labs signed-in integrity audit + migration contracts.
 * Structural only — no PHI in logs or PR surfaces.
 */

export const LABS_SIGNED_IN_RECONCILIATION_MIGRATION_VERSION = "labs_signed_in_reconciliation_v1" as const;

export type LabDerivedRowHealth =
  | "valid_active"
  | "stale_superseded"
  | "orphan_source_missing"
  | "orphan_extraction_missing"
  | "reference_as_result"
  | "duplicate_active"
  | "deleted_source_active"
  | "wrong_specimen"
  | "wrong_panel"
  | "wrong_role"
  | "user_protected"
  | "unknown_needs_review";

export type LabDerivedMigrationDecision =
  | "keep"
  | "supersede"
  | "delete"
  | "rebuild"
  | "preserve_user_override"
  | "manual_review_required";

export type LabDerivedLayer = "accepted" | "projection" | "draft" | "extraction" | "document" | "review";

export type LabIntegrityAuditRow = {
  /** Stable redacted token (hash of collection+id) — never raw id in aggregates. */
  recordToken: string;
  layer: LabDerivedLayer;
  health: LabDerivedRowHealth;
  decision: LabDerivedMigrationDecision;
  canonicalMetricId: string | null;
  sourceValueRole: string | null;
  resultKind: string | null;
  comparator: string | null;
  panelId: string | null;
  specimenType: string | null;
  sourcePage: number | null;
  collectedAt: string | null;
  reviewStatus: string | null;
  /** Hashed relationship tokens only. */
  sourceDocumentToken: string | null;
  sourceExtractionToken: string | null;
  sourceCandidateToken: string | null;
  reasons: readonly string[];
};

export type LabIntegrityAggregateCounts = {
  documents: number;
  activeDocuments: number;
  deletedDocumentsWithSurvivingRows: number;
  extractionGenerations: number;
  activeAcceptedResults: number;
  staleAcceptedResults: number;
  activeProjections: number;
  staleProjections: number;
  duplicateActiveMetricDatePoints: number;
  referenceAsResultRows: number;
  wrongSpecimenRows: number;
  wrongPanelRows: number;
  userProtectedRows: number;
  orphanRows: number;
  historyDuplicates: number;
  keep: number;
  supersede: number;
  delete: number;
  rebuild: number;
  preserveUserOverride: number;
  manualReviewRequired: number;
};

export type LabIntegrityAuditManifest = {
  migrationVersion: typeof LABS_SIGNED_IN_RECONCILIATION_MIGRATION_VERSION;
  generatedAt: string;
  dryRun: boolean;
  aggregates: LabIntegrityAggregateCounts;
  rows: readonly LabIntegrityAuditRow[];
};
