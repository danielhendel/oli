#!/usr/bin/env npx tsx
/**
 * Local structural acceptance probe for Quest/DirectLabs text PDFs (Phase 3D-A).
 * Prints ONLY structural counts — never raw text, values, or identifiers.
 *
 * Usage:
 *   npx tsx --tsconfig services/api/tsconfig.json \
 *     scripts/labs/structural-acceptance-probe.cli.ts --pdf /abs/path.pdf [--label A]
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { extractPdfTextPages } from "../../services/api/src/lib/labs/pdfTextExtraction";
import { extractQuestLabReportDraft } from "../../lib/labs/extraction/extractQuestLabReportDraft";
import { partitionLabCandidatesForAutoPublish } from "../../lib/labs/autoPublish/partitionLabAutoPublish";
import { LAB_AUTO_PUBLISH_POLICY_VERSION } from "../../lib/contracts/labsOs";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i < 0) return undefined;
  return process.argv[i + 1];
}

async function main() {
  const pdfPath = arg("--pdf");
  const label = arg("--label") ?? "report";
  if (!pdfPath) {
    console.error("Usage: --pdf /abs/path.pdf [--label A]");
    process.exit(2);
  }
  const abs = resolve(pdfPath);
  if (!existsSync(abs)) {
    console.error(JSON.stringify({ label, ok: false, error: "FILE_NOT_FOUND" }));
    process.exit(1);
  }

  const bytes = new Uint8Array(readFileSync(abs));
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  // Filename extension only — never print full private path.
  const ext = basename(abs).includes(".") ? basename(abs).split(".").pop() : "bin";

  let extraction;
  try {
    extraction = await extractPdfTextPages(bytes);
  } catch (err) {
    const code = err instanceof Error ? err.message : "PDF_EXTRACT_FAILED";
    console.log(
      JSON.stringify({
        label,
        supported: false,
        mediaExt: ext,
        byteLength: bytes.length,
        parserFailureReasonCode: code.slice(0, 80),
      }),
    );
    return;
  }

  const draft = extractQuestLabReportDraft({
    documentId: "structural_probe_doc",
    userId: "structural_probe_user",
    draftId: "structural_probe_draft",
    checksumSha256,
    pages: extraction.pages,
    createdAt: new Date().toISOString(),
  });

  const resultTypeCounts: Record<string, number> = {};
  for (const r of draft.results) {
    const kind = r.result?.kind ?? "missing";
    resultTypeCounts[kind] = (resultTypeCounts[kind] ?? 0) + 1;
  }

  const metadataFieldCount = Object.entries(draft.reportCandidate).filter(([k, v]) => {
    if (k === "confidence") return false;
    return v !== null && v !== undefined && v !== "";
  }).length;

  const reviewNeededCount = draft.results.filter(
    (r) => r.aliasMatch.requiresReview || r.confidence < 0.85 || r.warnings.length > 0,
  ).length;

  const partition = partitionLabCandidatesForAutoPublish(draft);
  const blockReasonCounts: Record<string, number> = {};
  for (const { decision } of partition.reviewRequired) {
    if (!decision.eligible) {
      for (const reason of decision.reasons) {
        blockReasonCounts[reason] = (blockReasonCounts[reason] ?? 0) + 1;
      }
    }
  }

  console.log(
    JSON.stringify({
      label,
      supported: draft.status !== "unsupported" && draft.status !== "failed",
      draftStatus: draft.status,
      pageCount: extraction.pageCount,
      textCharCount: extraction.textCharCount,
      pdfWarningCount: extraction.warningCodes.length,
      candidateCount: draft.results.length + draft.unmatched.length,
      matchedCount: draft.results.length,
      unmatchedCount: draft.unmatched.length,
      warningCount: draft.warnings.length,
      metadataFieldCount,
      resultTypeCounts,
      reviewNeededCount,
      autoPublishedCount: partition.autoPublishable.length,
      autoPublishReviewNeededCount: partition.reviewRequired.length,
      autoPublishBlockReasonCounts: blockReasonCounts,
      autoPublishPolicyVersion: LAB_AUTO_PUBLISH_POLICY_VERSION,
      panelCount: draft.panels.length,
      parserId: draft.parser.id,
      parserVersion: draft.parser.version,
      extractionVersion: draft.parser.extractionVersion,
      parserFailureReasonCode:
        draft.status === "unsupported" || draft.status === "failed"
          ? draft.warnings[0]?.code ?? draft.status
          : null,
    }),
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: "PROBE_CRASH", code: String(err?.message ?? err).slice(0, 80) }));
  process.exit(1);
});
