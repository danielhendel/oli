/**
 * Classify derived Labs rows for integrity audit / migration decisions.
 * Pure — no I/O. Never log PHI.
 */

import { createHash } from "node:crypto";

import { isLabReferenceLikeDisplayRow } from "../labSourceDisplay";
import type {
  LabDerivedMigrationDecision,
  LabDerivedRowHealth,
  LabIntegrityAggregateCounts,
  LabIntegrityAuditRow,
} from "./labDerivedIntegrityTypes";
import { LABS_SIGNED_IN_RECONCILIATION_MIGRATION_VERSION } from "./labDerivedIntegrityTypes";

export type LabDerivedAuditInput = {
  layer: "accepted" | "projection";
  collection: string;
  id: string;
  canonicalMetricId: string | null;
  sourceDocumentId: string | null;
  sourceExtractionId: string | null;
  sourceCandidateId: string | null;
  sourceValueRole: string | null;
  resultKind: string | null;
  comparator: string | null;
  rawValueText: string | null;
  panelId: string | null;
  specimenType: string | null;
  sourcePage: number | null;
  collectedAt: string | null;
  reviewStatus: string | null;
  publicationMode: string | null;
};

export type LabDocumentPresence = {
  id: string;
  /** deleted | active | missing */
  state: "active" | "deleted" | "missing";
  checksumSha256: string | null;
};

const USER_PROTECTED = new Set(["user_corrected", "user_accepted", "rejected"]);

function redactToken(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

function isInequalityComparator(cmp: string | null | undefined): boolean {
  return cmp === "lt" || cmp === "lte" || cmp === "gt" || cmp === "gte";
}

function inferComparator(row: LabDerivedAuditInput): string | null {
  if (row.comparator) return row.comparator;
  const raw = (row.rawValueText ?? "").trim();
  if (/^≤/.test(raw) || /^<=/.test(raw)) return "lte";
  if (/^≥/.test(raw) || /^>=/.test(raw)) return "gte";
  if (/^</.test(raw)) return "lt";
  if (/^>/.test(raw)) return "gt";
  if (row.resultKind === "numeric") return "eq";
  return null;
}

function isExplicitReferenceRole(role: string | null): boolean {
  return (
    role === "reference_optimal" ||
    role === "reference_moderate" ||
    role === "reference_high" ||
    role === "reference_general" ||
    role === "historical_result"
  );
}

/**
 * Same-draw equality + inequality pair: inequality is the Cardio IQ / Quest
 * threshold when an equality current exists for the same metric+document+date.
 */
export function isThresholdSiblingOfEqualityCurrent(args: {
  row: LabDerivedAuditInput;
  peers: readonly LabDerivedAuditInput[];
}): boolean {
  const cmp = inferComparator(args.row);
  if (!isInequalityComparator(cmp)) return false;
  // Explicit current_result inequalities (e.g. Mercury <4) are not thresholds
  // unless a same-draw equality peer exists.
  const peers = args.peers.filter(
    (p) =>
      p.id !== args.row.id &&
      p.canonicalMetricId === args.row.canonicalMetricId &&
      p.sourceDocumentId === args.row.sourceDocumentId &&
      (p.collectedAt ?? null) === (args.row.collectedAt ?? null) &&
      inferComparator(p) === "eq",
  );
  return peers.length > 0;
}

export function classifyLabDerivedRow(args: {
  row: LabDerivedAuditInput;
  peers: readonly LabDerivedAuditInput[];
  documentsById: ReadonlyMap<string, LabDocumentPresence>;
}): { health: LabDerivedRowHealth; decision: LabDerivedMigrationDecision; reasons: string[] } {
  const { row, peers, documentsById } = args;
  const reasons: string[] = [];

  if (row.reviewStatus && USER_PROTECTED.has(row.reviewStatus)) {
    // Still flag reference-as-result for manual review when user-protected.
    if (isExplicitReferenceRole(row.sourceValueRole)) {
      return {
        health: "user_protected",
        decision: "manual_review_required",
        reasons: ["user_override_on_reference_role"],
      };
    }
    return { health: "user_protected", decision: "preserve_user_override", reasons: ["user_override"] };
  }

  if (!row.sourceDocumentId) {
    return { health: "orphan_source_missing", decision: "delete", reasons: ["missing_source_document_id"] };
  }

  const doc = documentsById.get(row.sourceDocumentId);
  if (!doc || doc.state === "missing") {
    return { health: "orphan_source_missing", decision: "delete", reasons: ["source_document_missing"] };
  }
  if (doc.state === "deleted") {
    return { health: "deleted_source_active", decision: "delete", reasons: ["source_document_deleted"] };
  }

  if (isExplicitReferenceRole(row.sourceValueRole)) {
    return { health: "reference_as_result", decision: "delete", reasons: ["explicit_reference_role"] };
  }

  if (isThresholdSiblingOfEqualityCurrent({ row, peers })) {
    return {
      health: "reference_as_result",
      decision: "delete",
      reasons: ["inequality_sibling_of_equality_current"],
    };
  }

  // Legacy role-less inequality that looks like reference (no equality peer):
  // still reference-like for history/latest — migrate away unless current_result.
  if (
    row.sourceValueRole !== "current_result" &&
    isLabReferenceLikeDisplayRow({
      sourceValueRole: row.sourceValueRole,
      rawValueText: row.rawValueText,
      comparator: inferComparator(row),
    })
  ) {
    return { health: "reference_as_result", decision: "delete", reasons: ["legacy_reference_like"] };
  }

  // Duplicate active: same metric+document+date+fingerprint as another row with later id.
  const cmp = inferComparator(row);
  const fingerprint = `${row.resultKind ?? ""}:${cmp ?? ""}:${row.rawValueText ?? ""}`;
  const sameIdentityPeers = peers.filter(
    (p) =>
      p.id !== row.id &&
      p.layer === row.layer &&
      p.canonicalMetricId === row.canonicalMetricId &&
      p.sourceDocumentId === row.sourceDocumentId &&
      (p.collectedAt ?? null) === (row.collectedAt ?? null) &&
      `${p.resultKind ?? ""}:${inferComparator(p) ?? ""}:${p.rawValueText ?? ""}` === fingerprint,
  );
  if (sameIdentityPeers.length > 0) {
    const ids = [row.id, ...sameIdentityPeers.map((p) => p.id)].sort();
    if (ids[0] !== row.id) {
      return { health: "duplicate_active", decision: "delete", reasons: ["duplicate_identity_keep_lex_min"] };
    }
    reasons.push("duplicate_identity_survivor");
  }

  // Cross-fingerprint same-draw duplicates (eq + eq from different pages) — keep later page.
  if (cmp === "eq") {
    const eqPeers = peers.filter(
      (p) =>
        p.id !== row.id &&
        p.canonicalMetricId === row.canonicalMetricId &&
        p.sourceDocumentId === row.sourceDocumentId &&
        (p.collectedAt ?? null) === (row.collectedAt ?? null) &&
        inferComparator(p) === "eq" &&
        `${p.resultKind ?? ""}:${p.rawValueText ?? ""}` === `${row.resultKind ?? ""}:${row.rawValueText ?? ""}`,
    );
    if (eqPeers.length > 0) {
      const best = [row, ...eqPeers].sort((a, b) => (b.sourcePage ?? 0) - (a.sourcePage ?? 0))[0];
      if (best && best.id !== row.id) {
        return { health: "duplicate_active", decision: "delete", reasons: ["duplicate_page_representation"] };
      }
    }
  }

  return { health: "valid_active", decision: "keep", reasons: reasons.length ? reasons : ["ok"] };
}

export function toIntegrityAuditRow(
  row: LabDerivedAuditInput,
  classified: ReturnType<typeof classifyLabDerivedRow>,
): LabIntegrityAuditRow {
  return {
    recordToken: redactToken([row.collection, row.id]),
    layer: row.layer,
    health: classified.health,
    decision: classified.decision,
    canonicalMetricId: row.canonicalMetricId,
    sourceValueRole: row.sourceValueRole,
    resultKind: row.resultKind,
    comparator: inferComparator(row),
    panelId: row.panelId,
    specimenType: row.specimenType,
    sourcePage: row.sourcePage,
    collectedAt: row.collectedAt ? row.collectedAt.slice(0, 10) : null,
    reviewStatus: row.reviewStatus,
    sourceDocumentToken: row.sourceDocumentId ? redactToken(["doc", row.sourceDocumentId]) : null,
    sourceExtractionToken: row.sourceExtractionId ? redactToken(["ex", row.sourceExtractionId]) : null,
    sourceCandidateToken: row.sourceCandidateId ? redactToken(["cand", row.sourceCandidateId]) : null,
    reasons: classified.reasons,
  };
}

export function emptyIntegrityAggregates(): LabIntegrityAggregateCounts {
  return {
    documents: 0,
    activeDocuments: 0,
    deletedDocumentsWithSurvivingRows: 0,
    extractionGenerations: 0,
    activeAcceptedResults: 0,
    staleAcceptedResults: 0,
    activeProjections: 0,
    staleProjections: 0,
    duplicateActiveMetricDatePoints: 0,
    referenceAsResultRows: 0,
    wrongSpecimenRows: 0,
    wrongPanelRows: 0,
    userProtectedRows: 0,
    orphanRows: 0,
    historyDuplicates: 0,
    keep: 0,
    supersede: 0,
    delete: 0,
    rebuild: 0,
    preserveUserOverride: 0,
    manualReviewRequired: 0,
  };
}

export function accumulateIntegrityRow(
  aggregates: LabIntegrityAggregateCounts,
  row: LabIntegrityAuditRow,
): void {
  switch (row.health) {
    case "valid_active":
      if (row.layer === "accepted") aggregates.activeAcceptedResults += 1;
      if (row.layer === "projection") aggregates.activeProjections += 1;
      break;
    case "stale_superseded":
      if (row.layer === "accepted") aggregates.staleAcceptedResults += 1;
      if (row.layer === "projection") aggregates.staleProjections += 1;
      break;
    case "reference_as_result":
      aggregates.referenceAsResultRows += 1;
      break;
    case "duplicate_active":
      aggregates.duplicateActiveMetricDatePoints += 1;
      aggregates.historyDuplicates += 1;
      break;
    case "deleted_source_active":
    case "orphan_source_missing":
    case "orphan_extraction_missing":
      aggregates.orphanRows += 1;
      break;
    case "wrong_specimen":
      aggregates.wrongSpecimenRows += 1;
      break;
    case "wrong_panel":
      aggregates.wrongPanelRows += 1;
      break;
    case "user_protected":
      aggregates.userProtectedRows += 1;
      break;
    default:
      break;
  }
  switch (row.decision) {
    case "keep":
      aggregates.keep += 1;
      break;
    case "supersede":
      aggregates.supersede += 1;
      break;
    case "delete":
      aggregates.delete += 1;
      break;
    case "rebuild":
      aggregates.rebuild += 1;
      break;
    case "preserve_user_override":
      aggregates.preserveUserOverride += 1;
      break;
    case "manual_review_required":
      aggregates.manualReviewRequired += 1;
      break;
  }
}

export function buildIntegrityManifest(args: {
  dryRun: boolean;
  generatedAt?: string;
  rows: readonly LabIntegrityAuditRow[];
  documents: number;
  activeDocuments: number;
  deletedDocumentsWithSurvivingRows: number;
  extractionGenerations: number;
}): {
  migrationVersion: typeof LABS_SIGNED_IN_RECONCILIATION_MIGRATION_VERSION;
  generatedAt: string;
  dryRun: boolean;
  aggregates: LabIntegrityAggregateCounts;
  rows: readonly LabIntegrityAuditRow[];
} {
  const aggregates = emptyIntegrityAggregates();
  aggregates.documents = args.documents;
  aggregates.activeDocuments = args.activeDocuments;
  aggregates.deletedDocumentsWithSurvivingRows = args.deletedDocumentsWithSurvivingRows;
  aggregates.extractionGenerations = args.extractionGenerations;
  for (const row of args.rows) accumulateIntegrityRow(aggregates, row);
  return {
    migrationVersion: LABS_SIGNED_IN_RECONCILIATION_MIGRATION_VERSION,
    generatedAt: args.generatedAt ?? new Date().toISOString(),
    dryRun: args.dryRun,
    aggregates,
    rows: args.rows,
  };
}
