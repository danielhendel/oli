#!/usr/bin/env npx tsx
/**
 * Classify unmatched candidates + warning codes for a private Quest PDF.
 * Prints ONLY structural classification counts — never labels, values, or PII.
 *
 * Usage:
 *   npx tsx --tsconfig services/api/tsconfig.json \
 *     scripts/labs/classify-report-structure.cli.ts --pdf /abs/path.pdf [--label A]
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractPdfTextPages } from "../../services/api/src/lib/labs/pdfTextExtraction";
import { extractQuestLabReportDraft } from "../../lib/labs/extraction/extractQuestLabReportDraft";
import type { LabUnmatchedCandidate } from "@oli/contracts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}

type UnmatchedClass =
  | "explanatory_prose"
  | "report_header"
  | "report_footer"
  | "panel_label"
  | "historical_reference_column"
  | "report_risk_category_row"
  | "method_note"
  | "performing_lab_row"
  | "unsupported_analyte"
  | "alias_missing"
  | "true_row_segmentation_failure"
  | "ambiguous_row"
  | "duplicate_candidate"
  | "other";

function classifyUnmatched(u: LabUnmatchedCandidate): UnmatchedClass {
  const label = u.rawAnalyteLabel.trim();
  const result = (u.rawResult ?? "").trim();
  const blob = `${label} ${result}`;

  if (u.reason === "historical_column") return "historical_reference_column";
  if (u.reason === "ambiguous_alias") return "ambiguous_row";
  if (u.reason === "unsupported_result_type") return "unsupported_analyte";

  if (/^(page\s+\d+|continued|confidential|quest\s+diagnostics|directlabs|report\s+status)/i.test(label)) {
    return label.length < 80 ? "report_header" : "report_footer";
  }
  if (/performing\s*lab|laboratory\s*director|clia|medicare/i.test(blob)) return "performing_lab_row";
  if (/method|performed\s+by|assay|immunoassay|lc\/?ms/i.test(blob) && !/\d/.test(result)) {
    return "method_note";
  }
  if (/risk|optimal|moderate|high\s+risk|cardio\s*iq\s+summary|inflammation\s+summary/i.test(blob)) {
    return "report_risk_category_row";
  }
  if (
    /^(lipid\s+panel|comprehensive\s+metabolic|cmp|cbc|complete\s+blood|thyroid|hormone|cardio\s*iq|hepatitis|antibody|iron|electrolyte|urinalysis)/i.test(
      label,
    )
  ) {
    return "panel_label";
  }
  if (
    /consistent with|please note|see comment|interpretive|reference appendix|for additional|this test was|comments?:/i.test(
      blob,
    ) ||
    label.split(/\s+/).length > 8
  ) {
    return "explanatory_prose";
  }
  if (u.reason === "unmatched_alias") {
    // Has a parseable result-ish token but no catalog alias.
    if (result.length > 0) return "alias_missing";
    return "true_row_segmentation_failure";
  }
  return "other";
}

function warningBucket(code: string): "expected_review" | "parser_defect" | "other" {
  const expected = new Set([
    "ambiguous_analyte",
    "ambiguous_value",
    "ambiguous_unit",
    "ambiguous_reference_range",
    "ambiguous_flag",
    "low_confidence",
    "unsupported_layout",
    "scanned_pdf_no_text",
    "encrypted_pdf",
  ]);
  const defects = new Set([
    "duplicate_candidate",
    "page_count_mismatch",
    "partial_page_text",
  ]);
  if (expected.has(code)) return "expected_review";
  if (defects.has(code)) return "parser_defect";
  // Heuristic: false analyte / header leakage often tagged ambiguous_* already.
  return "other";
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
    console.log(JSON.stringify({ label, ok: false, error: "FILE_NOT_FOUND" }));
    process.exit(1);
  }

  const bytes = new Uint8Array(readFileSync(abs));
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const extraction = await extractPdfTextPages(bytes);
  const draft = extractQuestLabReportDraft({
    documentId: "classify_doc",
    userId: "classify_user",
    draftId: "classify_draft",
    checksumSha256,
    pages: extraction.pages,
    createdAt: new Date().toISOString(),
  });

  const unmatchedClassCounts: Record<string, number> = {};
  for (const u of draft.unmatched) {
    const c = classifyUnmatched(u);
    unmatchedClassCounts[c] = (unmatchedClassCounts[c] ?? 0) + 1;
  }

  const warningCodeCounts: Record<string, number> = {};
  const warningBucketCounts: Record<string, number> = {};
  for (const w of draft.warnings) {
    warningCodeCounts[w.code] = (warningCodeCounts[w.code] ?? 0) + 1;
    const b = warningBucket(w.code);
    warningBucketCounts[b] = (warningBucketCounts[b] ?? 0) + 1;
  }

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

  // Structural shape of unmatched reasons (no labels)
  const unmatchedReasonCounts: Record<string, number> = {};
  for (const u of draft.unmatched) {
    unmatchedReasonCounts[u.reason] = (unmatchedReasonCounts[u.reason] ?? 0) + 1;
  }

  console.log(
    JSON.stringify({
      label,
      draftStatus: draft.status,
      supported: draft.status !== "unsupported" && draft.status !== "failed",
      pageCount: extraction.pageCount,
      candidateCount: draft.results.length + draft.unmatched.length,
      matchedCount: draft.results.length,
      unmatchedCount: draft.unmatched.length,
      warningCount: draft.warnings.length,
      metadataFieldCount,
      resultTypeCounts,
      reviewNeededCount,
      panelCount: draft.panels.length,
      unmatchedReasonCounts,
      unmatchedClassCounts,
      warningCodeCounts,
      warningBucketCounts,
      parserId: draft.parser.id,
      parserVersion: draft.parser.version,
      extractionVersion: draft.parser.extractionVersion,
    }),
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err?.message ?? err).slice(0, 80) }));
  process.exit(1);
});
