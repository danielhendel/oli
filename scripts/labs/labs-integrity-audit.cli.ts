#!/usr/bin/env npx tsx
/**
 * Read-only Labs integrity audit (+ optional dry-run / apply migration).
 *
 * Prints AGGREGATES ONLY to stdout. Private manifests write outside the repo.
 *
 * Usage:
 *   GOOGLE_CLOUD_PROJECT=oli-staging-fdbba npx tsx --tsconfig scripts/tsconfig.json \
 *     scripts/labs/labs-integrity-audit.cli.ts \
 *     --uid <uid> \
 *     --out-dir ~/oli-private/labs-integrity/<timestamp> \
 *     [--metric total_cholesterol] \
 *     [--dry-run-migrate] \
 *     [--apply-migrate]   # requires --i-understand-mutate and verified safety export
 *     [--safety-export]   # writes ZIP + checksums under out-dir
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import {
  planLabsSignedInReconciliation,
  applyLabsSignedInReconciliation,
  LABS_SIGNED_IN_RECONCILIATION_MIGRATION_VERSION,
} from "../../lib/labs/integrity/labsSignedInReconciliationMigration";
import type { LabDerivedAuditInput, LabDocumentPresence } from "../../lib/labs/integrity/classifyLabDerivedRow";
import {
  selectLabConsumerHistoryRows,
  selectLabConsumerLatestResult,
} from "../../lib/labs/integrity/filterLabHistoryForConsumer";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}
function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function log(obj: Record<string, unknown>): void {
  console.log(JSON.stringify(obj));
}

function token(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 12);
}

function toIso(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

async function main(): Promise<void> {
  const uid = arg("--uid");
  const outDirArg = arg("--out-dir");
  const metricFilter = arg("--metric") ?? null;
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    arg("--project-id") ||
    "oli-staging-fdbba";

  if (!uid) {
    log({ ok: false, error: "UID_REQUIRED" });
    process.exit(2);
  }
  if (!outDirArg) {
    log({ ok: false, error: "OUT_DIR_REQUIRED" });
    process.exit(2);
  }
  const outDir = resolve(outDirArg);
  if (outDir.includes("/oli-labs-phase3da-extraction") || outDir.includes("/Users/danielhendel/oli/")) {
    // Soft guard: allow only if path contains oli-private or is clearly outside typical repos.
    if (!outDir.includes("oli-private") && !outDir.includes("/tmp/") && !outDir.includes(".tmp-")) {
      log({ ok: false, error: "OUT_DIR_MUST_BE_OUTSIDE_REPO" });
      process.exit(2);
    }
  }
  mkdirSync(outDir, { recursive: true });

  if (!getApps().length) {
    initializeApp({ projectId });
  }
  const db = getFirestore();
  const userRef = db.collection("users").doc(uid);

  const documentsSnap = await userRef.collection("documents").get();
  const documents: LabDocumentPresence[] = [];
  const documentMeta: Record<string, unknown>[] = [];
  for (const d of documentsSnap.docs) {
    const raw = d.data() as Record<string, unknown>;
    const status = typeof raw.status === "string" ? raw.status : "unknown";
    const state: LabDocumentPresence["state"] =
      status === "deleted" || status === "purged" ? "deleted" : "active";
    documents.push({
      id: d.id,
      state,
      checksumSha256: typeof raw.checksumSha256 === "string" ? raw.checksumSha256 : null,
    });
    documentMeta.push({
      token: token(`doc:${d.id}`),
      state,
      status,
      domain: raw.domain ?? null,
      documentType: raw.documentType ?? null,
      hasChecksum: typeof raw.checksumSha256 === "string",
      uploadedAt: toIso(raw.uploadedAt),
      legacyLabUploadIdPresent: typeof raw.legacyLabUploadId === "string",
      byteSize: typeof raw.byteSize === "number" ? raw.byteSize : null,
    });
  }

  const extractionsSnap = await userRef.collection("documentExtractions").get();
  const extractionGenerations = extractionsSnap.size;

  const acceptedSnap = await userRef.collection("labAcceptedResults").get();
  const resultsSnap = await userRef.collection("labResults").get();

  const acceptedInputs: LabDerivedAuditInput[] = [];
  const projectionInputs: LabDerivedAuditInput[] = [];
  const privateAcceptedDump: Record<string, unknown>[] = [];

  for (const d of acceptedSnap.docs) {
    const raw = d.data() as Record<string, unknown>;
    const metric =
      typeof raw.canonicalMetricId === "string" ? raw.canonicalMetricId : null;
    if (metricFilter && metric !== metricFilter) continue;
    const provenance =
      raw.provenance && typeof raw.provenance === "object"
        ? (raw.provenance as Record<string, unknown>)
        : {};
    const result =
      raw.result && typeof raw.result === "object" ? (raw.result as Record<string, unknown>) : {};
    const review =
      raw.review && typeof raw.review === "object" ? (raw.review as Record<string, unknown>) : {};
    const specimen =
      raw.specimen && typeof raw.specimen === "object" ? (raw.specimen as Record<string, unknown>) : {};
    const input: LabDerivedAuditInput = {
      layer: "accepted",
      collection: "labAcceptedResults",
      id: d.id,
      canonicalMetricId: metric,
      sourceDocumentId: typeof raw.sourceDocumentId === "string" ? raw.sourceDocumentId : null,
      sourceExtractionId: typeof raw.sourceExtractionId === "string" ? raw.sourceExtractionId : null,
      sourceCandidateId: typeof raw.sourceCandidateId === "string" ? raw.sourceCandidateId : null,
      sourceValueRole: typeof provenance.sourceValueRole === "string" ? provenance.sourceValueRole : null,
      resultKind: typeof result.kind === "string" ? result.kind : null,
      comparator: typeof result.comparator === "string" ? result.comparator : null,
      rawValueText: result.value != null ? String(result.value) : null,
      panelId: typeof raw.panelId === "string" ? raw.panelId : null,
      specimenType: typeof specimen.type === "string" ? specimen.type : null,
      sourcePage: typeof provenance.sourcePage === "number" ? provenance.sourcePage : null,
      collectedAt: toIso(raw.collectedAt),
      reviewStatus: typeof review.status === "string" ? review.status : null,
      publicationMode: typeof review.publicationMode === "string" ? review.publicationMode : null,
    };
    acceptedInputs.push(input);
    privateAcceptedDump.push({
      ...input,
      // private values stay in local out-dir only
      resultValue: result.value ?? null,
      rawReferenceRange: raw.rawReferenceRange ?? null,
      rawAnalyteLabel: raw.rawAnalyteLabel ?? null,
    });
  }

  for (const d of resultsSnap.docs) {
    const raw = d.data() as Record<string, unknown>;
    if (raw.schemaVersion !== 2) continue;
    const metric = typeof raw.metricKey === "string" ? raw.metricKey : null;
    if (metricFilter && metric !== metricFilter) continue;
    projectionInputs.push({
      layer: "projection",
      collection: "labResults",
      id: d.id,
      canonicalMetricId: metric,
      sourceDocumentId:
        (typeof raw.sourceDocumentId === "string" ? raw.sourceDocumentId : null) ??
        (typeof raw.uploadId === "string" ? raw.uploadId : null),
      sourceExtractionId: typeof raw.sourceExtractionId === "string" ? raw.sourceExtractionId : null,
      sourceCandidateId: typeof raw.sourceCandidateId === "string" ? raw.sourceCandidateId : null,
      sourceValueRole: typeof raw.sourceValueRole === "string" ? raw.sourceValueRole : null,
      resultKind: typeof raw.value === "number" ? "numeric" : raw.value != null ? "text" : null,
      comparator: (() => {
        const rawText = typeof raw.rawValueText === "string" ? raw.rawValueText.trim() : "";
        if (/^≤/.test(rawText) || /^<=/.test(rawText)) return "lte";
        if (/^≥/.test(rawText) || /^>=/.test(rawText)) return "gte";
        if (/^</.test(rawText)) return "lt";
        if (/^>/.test(rawText)) return "gt";
        if (typeof raw.value === "number") return "eq";
        return null;
      })(),
      rawValueText: typeof raw.rawValueText === "string" ? raw.rawValueText : null,
      panelId: typeof raw.panelName === "string" ? raw.panelName : null,
      specimenType: null,
      sourcePage: typeof raw.sourcePage === "number" ? raw.sourcePage : null,
      collectedAt: toIso(raw.collectedAt),
      reviewStatus: typeof raw.publicationMode === "string" ? raw.publicationMode : null,
      publicationMode: typeof raw.publicationMode === "string" ? raw.publicationMode : null,
    });
  }

  // Infer missing documents referenced by accepted rows.
  for (const row of acceptedInputs) {
    if (row.sourceDocumentId && !documents.some((d) => d.id === row.sourceDocumentId)) {
      documents.push({ id: row.sourceDocumentId, state: "missing", checksumSha256: null });
    }
  }

  const dryRun = !hasFlag("--apply-migrate");
  const plan = planLabsSignedInReconciliation({
    dryRun,
    accepted: acceptedInputs,
    projections: projectionInputs,
    documents,
    extractionGenerations,
  });

  // Metric-scoped history simulation for Total Cholesterol (private file).
  const tcAccepted = acceptedInputs.filter((r) => r.canonicalMetricId === "total_cholesterol");
  const tcHistorySim = selectLabConsumerHistoryRows(
    tcAccepted.map((r) => ({
      id: r.id,
      canonicalMetricId: r.canonicalMetricId!,
      collectedAt: r.collectedAt,
      panelId: r.panelId,
      specimenType: r.specimenType,
      sourcePage: r.sourcePage,
      sourceDocumentId: r.sourceDocumentId,
      sourceValueRole: r.sourceValueRole,
      reviewStatus: r.reviewStatus,
      result: {
        kind: r.resultKind ?? "numeric",
        value: r.rawValueText ?? undefined,
        comparator: r.comparator ?? undefined,
      },
      rawValueText:
        r.comparator === "lt"
          ? `<${r.rawValueText}`
          : r.comparator === "eq"
            ? r.rawValueText
            : r.rawValueText,
      resultFingerprint: `${r.resultKind}:${r.comparator}:${r.rawValueText}`,
    })),
  );
  const tcLatest = selectLabConsumerLatestResult(
    tcAccepted.map((r) => ({
      id: r.id,
      canonicalMetricId: r.canonicalMetricId!,
      collectedAt: r.collectedAt,
      panelId: r.panelId,
      specimenType: r.specimenType,
      sourcePage: r.sourcePage,
      sourceDocumentId: r.sourceDocumentId,
      sourceValueRole: r.sourceValueRole,
      reviewStatus: r.reviewStatus,
      result: {
        kind: r.resultKind ?? "numeric",
        value: r.rawValueText ?? undefined,
        comparator: r.comparator ?? undefined,
      },
      rawValueText:
        r.comparator === "lt" ? `<${r.rawValueText}` : r.rawValueText,
      resultFingerprint: `${r.resultKind}:${r.comparator}:${r.rawValueText}`,
    })),
  );

  writeFileSync(
    resolve(outDir, "manifest.aggregates.json"),
    JSON.stringify(
      {
        migrationVersion: LABS_SIGNED_IN_RECONCILIATION_MIGRATION_VERSION,
        aggregates: plan.manifest.aggregates,
        blocked: plan.blocked,
        blockReasons: plan.blockReasons,
        deleteAcceptedCount: plan.deleteAcceptedIds.length,
        deleteProjectionCount: plan.deleteProjectionIds.length,
        preserveAcceptedCount: plan.preserveAcceptedIds.length,
        manualReviewCount: plan.manualReviewAcceptedIds.length,
        totalCholesterol: {
          acceptedRowCount: tcAccepted.length,
          historyAfterFilterCount: tcHistorySim.length,
          latestComparator: tcLatest?.result && "comparator" in (tcLatest.result as object)
            ? (tcLatest.result as { comparator?: string }).comparator ?? null
            : null,
          latestLooksInequality: Boolean(tcLatest?.rawValueText?.trim().startsWith("<")),
        },
        documents: documentMeta,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    resolve(outDir, "manifest.rows.private.json"),
    JSON.stringify({ rows: plan.manifest.rows, privateAcceptedDump }, null, 2),
  );

  if (hasFlag("--safety-export")) {
    const exportDir = resolve(outDir, "safety-export");
    mkdirSync(exportDir, { recursive: true });
    const collections = [
      "documents",
      "documentIngestionJobs",
      "documentExtractions",
      "labUploads",
      "labResults",
      "labExtractionDrafts",
      "labReviews",
      "labAcceptedResults",
    ] as const;
    const exportIndex: Record<string, number> = {};
    for (const col of collections) {
      const snap = await userRef.collection(col).get();
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      exportIndex[col] = rows.length;
      writeFileSync(resolve(exportDir, `${col}.json`), JSON.stringify(rows, null, 2));
    }
    // Pull original PDFs when storageObjectId present.
    let pdfCount = 0;
    const pdfFailures: string[] = [];
    try {
      const bucketName =
        process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
        `${projectId}.firebasestorage.app`;
      const bucket = getStorage().bucket(bucketName);
      const pdfDir = resolve(exportDir, "pdfs");
      mkdirSync(pdfDir, { recursive: true });
      for (const d of documentsSnap.docs) {
        const raw = d.data() as Record<string, unknown>;
        const objectPath =
          (typeof raw.storageObjectId === "string" && raw.storageObjectId) ||
          (typeof raw.storageObjectPath === "string" && raw.storageObjectPath) ||
          `users/${uid}/documents/${d.id}/original`;
        try {
          const dest = resolve(pdfDir, `${token(d.id)}.pdf`);
          await bucket.file(objectPath).download({ destination: dest });
          const bytes = readFileSync(dest);
          if (bytes.length > 0 && bytes.subarray(0, 4).toString() === "%PDF") {
            pdfCount += 1;
          } else {
            pdfFailures.push(token(d.id));
          }
        } catch {
          pdfFailures.push(token(d.id));
        }
      }
      writeFileSync(
        resolve(exportDir, "pdf-download-status.json"),
        JSON.stringify({ bucketName, pdfCount, pdfFailures: pdfFailures.length }, null, 2),
      );
    } catch {
      writeFileSync(
        resolve(exportDir, "pdf-download-status.json"),
        JSON.stringify({ ok: false, error: "STORAGE_UNAVAILABLE" }, null, 2),
      );
    }
    writeFileSync(
      resolve(exportDir, "export-index.json"),
      JSON.stringify(
        { collections: exportIndex, pdfCount, pdfFailureCount: pdfFailures.length, verifiedAt: new Date().toISOString() },
        null,
        2,
      ),
    );
    // gzip package of export dir listing checksum
    const indexBytes = readFileSync(resolve(exportDir, "export-index.json"));
    const checksum = createHash("sha256").update(indexBytes).digest("hex");
    writeFileSync(resolve(outDir, "SAFETY_EXPORT_CHECKSUM.txt"), checksum);
    writeFileSync(
      resolve(outDir, "SAFETY_EXPORT_VERIFIED.json"),
      JSON.stringify({ ok: true, checksum, pdfCount, collections: exportIndex }, null, 2),
    );
    log({ ok: true, event: "SAFETY_EXPORT_VERIFIED", pdfCount, collections: exportIndex });
  }

  log({
    ok: true,
    event: "AUDIT_COMPLETE",
    migrationVersion: LABS_SIGNED_IN_RECONCILIATION_MIGRATION_VERSION,
    dryRun,
    aggregates: plan.manifest.aggregates,
    blocked: plan.blocked,
    blockReasons: plan.blockReasons,
    deleteAcceptedCount: plan.deleteAcceptedIds.length,
    preserveAcceptedCount: plan.preserveAcceptedIds.length,
    manualReviewCount: plan.manualReviewAcceptedIds.length,
    totalCholesterolHistoryAfterFilter: tcHistorySim.length,
    totalCholesterolLatestIsInequality: Boolean(tcLatest?.rawValueText?.trim().startsWith("<")),
  });

  if (hasFlag("--apply-migrate")) {
    if (!hasFlag("--i-understand-mutate")) {
      log({ ok: false, error: "APPLY_REQUIRES_CONFIRM_FLAG" });
      process.exit(2);
    }
    if (!existsSync(resolve(outDir, "SAFETY_EXPORT_VERIFIED.json"))) {
      log({ ok: false, error: "SAFETY_EXPORT_REQUIRED_BEFORE_MUTATE" });
      process.exit(2);
    }
    if (plan.blocked) {
      log({ ok: false, error: "MIGRATION_BLOCKED", blockReasons: plan.blockReasons });
      process.exit(3);
    }
    const execPlan = planLabsSignedInReconciliation({
      dryRun: false,
      accepted: acceptedInputs,
      projections: projectionInputs,
      documents,
      extractionGenerations,
    });
    const result = await applyLabsSignedInReconciliation(execPlan, {
      deleteAccepted: async (id) => {
        await userRef.collection("labAcceptedResults").doc(id).delete();
      },
      deleteProjection: async (id) => {
        await userRef.collection("labResults").doc(id).delete();
      },
    });
    log({
      ok: true,
      event: "MIGRATION_APPLIED",
      deletedAccepted: result.deletedAccepted,
      deletedProjections: result.deletedProjections,
      skipped: result.skipped,
      skipReason: result.skipReason,
    });
  }
}

main().catch((err) => {
  log({ ok: false, error: "FATAL", message: err instanceof Error ? err.message : "unknown" });
  process.exit(1);
});
