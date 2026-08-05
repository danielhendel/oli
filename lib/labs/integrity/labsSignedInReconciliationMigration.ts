/**
 * labs_signed_in_reconciliation_v1 — pure migration decision + apply helpers.
 */

import {
  buildIntegrityManifest,
  classifyLabDerivedRow,
  toIntegrityAuditRow,
  type LabDerivedAuditInput,
  type LabDocumentPresence,
} from "./classifyLabDerivedRow";
import type { LabIntegrityAuditManifest, LabIntegrityAuditRow } from "./labDerivedIntegrityTypes";
import { LABS_SIGNED_IN_RECONCILIATION_MIGRATION_VERSION } from "./labDerivedIntegrityTypes";

export { LABS_SIGNED_IN_RECONCILIATION_MIGRATION_VERSION };

export type LabsReconciliationPlan = {
  manifest: LabIntegrityAuditManifest;
  deleteAcceptedIds: string[];
  deleteProjectionIds: string[];
  preserveAcceptedIds: string[];
  manualReviewAcceptedIds: string[];
  blocked: boolean;
  blockReasons: string[];
};

export function planLabsSignedInReconciliation(args: {
  dryRun: boolean;
  accepted: readonly LabDerivedAuditInput[];
  projections: readonly LabDerivedAuditInput[];
  documents: readonly LabDocumentPresence[];
  extractionGenerations: number;
}): LabsReconciliationPlan {
  const documentsById = new Map(args.documents.map((d) => [d.id, d]));
  const peers: LabDerivedAuditInput[] = [...args.accepted, ...args.projections];
  const rows: LabIntegrityAuditRow[] = [];
  const deleteAcceptedIds: string[] = [];
  const deleteProjectionIds: string[] = [];
  const preserveAcceptedIds: string[] = [];
  const manualReviewAcceptedIds: string[] = [];

  for (const row of args.accepted) {
    const classified = classifyLabDerivedRow({ row, peers, documentsById });
    rows.push(toIntegrityAuditRow(row, classified));
    if (classified.decision === "delete" || classified.decision === "supersede") {
      deleteAcceptedIds.push(row.id);
    } else if (classified.decision === "preserve_user_override") {
      preserveAcceptedIds.push(row.id);
    } else if (classified.decision === "manual_review_required") {
      manualReviewAcceptedIds.push(row.id);
    }
  }
  for (const row of args.projections) {
    const classified = classifyLabDerivedRow({ row, peers, documentsById });
    rows.push(toIntegrityAuditRow(row, classified));
    if (classified.decision === "delete" || classified.decision === "supersede") {
      deleteProjectionIds.push(row.id);
    }
  }

  const deletedDocs = args.documents.filter((d) => d.state === "deleted");
  const survivingFromDeleted = rows.filter(
    (r) => r.health === "deleted_source_active" || r.health === "orphan_source_missing",
  ).length;

  const manifest = buildIntegrityManifest({
    dryRun: args.dryRun,
    rows,
    documents: args.documents.length,
    activeDocuments: args.documents.filter((d) => d.state === "active").length,
    deletedDocumentsWithSurvivingRows: deletedDocs.length > 0 && survivingFromDeleted > 0 ? deletedDocs.length : 0,
    extractionGenerations: args.extractionGenerations,
  });

  const blockReasons: string[] = [];
  if (manifest.aggregates.manualReviewRequired > 0) {
    blockReasons.push("manual_review_required_rows");
  }
  // Never auto-delete user overrides — already preserved; block if any would be deleted.
  const overrideWouldDelete = rows.some(
    (r) => r.health === "user_protected" && (r.decision === "delete" || r.decision === "supersede"),
  );
  if (overrideWouldDelete) blockReasons.push("user_override_would_delete");

  return {
    manifest,
    deleteAcceptedIds,
    deleteProjectionIds,
    preserveAcceptedIds,
    manualReviewAcceptedIds,
    blocked: blockReasons.length > 0,
    blockReasons,
  };
}

export type LabsReconciliationApplyDeps = {
  deleteAccepted: (id: string) => Promise<void>;
  deleteProjection: (id: string) => Promise<void>;
};

export type LabsReconciliationApplyResult = {
  deletedAccepted: number;
  deletedProjections: number;
  skipped: boolean;
  skipReason: string | null;
};

export async function applyLabsSignedInReconciliation(
  plan: LabsReconciliationPlan,
  deps: LabsReconciliationApplyDeps,
): Promise<LabsReconciliationApplyResult> {
  if (plan.blocked) {
    return {
      deletedAccepted: 0,
      deletedProjections: 0,
      skipped: true,
      skipReason: plan.blockReasons.join(","),
    };
  }
  if (plan.manifest.dryRun) {
    return {
      deletedAccepted: 0,
      deletedProjections: 0,
      skipped: true,
      skipReason: "dry_run",
    };
  }
  let deletedAccepted = 0;
  let deletedProjections = 0;
  for (const id of plan.deleteAcceptedIds) {
    await deps.deleteAccepted(id);
    deletedAccepted += 1;
  }
  const projIds = new Set(plan.deleteProjectionIds);
  // Accepted cleanup usually shares id with projection — ensure both deleted.
  for (const id of plan.deleteAcceptedIds) projIds.add(id);
  for (const id of projIds) {
    await deps.deleteProjection(id);
    deletedProjections += 1;
  }
  return { deletedAccepted, deletedProjections, skipped: false, skipReason: null };
}
