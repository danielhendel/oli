/**
 * Structural classification of auto-publish review-required rows (counts only).
 * Never prints labels or values.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { extractPdfTextPages } from "../../services/api/src/lib/labs/pdfTextExtraction";
import { extractQuestLabReportDraft } from "../../lib/labs/extraction/extractQuestLabReportDraft";
import { partitionLabCandidatesForAutoPublish } from "../../lib/labs/autoPublish/partitionLabAutoPublish";

async function main() {
  const abs = process.argv[2];
  if (!abs) {
    console.error("Usage: path/to.pdf");
    process.exit(2);
  }
  const bytes = new Uint8Array(readFileSync(abs));
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const extraction = await extractPdfTextPages(bytes);
  const draft = extractQuestLabReportDraft({
    documentId: "structural_probe_doc",
    userId: "structural_probe_user",
    draftId: "structural_probe_draft",
    checksumSha256,
    pages: extraction.pages,
    createdAt: new Date().toISOString(),
  });
  const part = partitionLabCandidatesForAutoPublish(draft);

  const reasonCounts: Record<string, number> = {};
  const buckets: Record<string, number> = {};
  const comparators: Record<string, number> = {};
  let rangeOnly = 0;
  let unitUnknown = 0;
  let inequality = 0;
  let metricProfile = 0;
  let blockingOnly = 0;
  let other = 0;

  for (const { candidate, decision } of part.reviewRequired) {
    const reasons = decision.eligible ? [] : [...decision.reasons];
    for (const r of reasons) reasonCounts[r] = (reasonCounts[r] ?? 0) + 1;
    const cmp = candidate.result?.kind === "numeric" ? candidate.result.comparator : "none";
    comparators[cmp] = (comparators[cmp] ?? 0) + 1;

    const isIneq = candidate.result?.kind === "numeric" && candidate.result.comparator !== "eq";
    const isUnit = reasons.includes("unit_unknown") || reasons.includes("unit_incompatible");
    const isMetric = reasons.includes("metric_not_auto_publish_v1");
    const hasAmbRange = candidate.warnings.includes("ambiguous_reference_range");
    const onlyOptionalAmbiguity =
      !isIneq &&
      !isUnit &&
      !isMetric &&
      hasAmbRange &&
      reasons.every((r) => r === "blocking_warning" || r === "low_dimension_confidence");

    if (isIneq) {
      inequality += 1;
      buckets.inequality = (buckets.inequality ?? 0) + 1;
    } else if (isUnit) {
      unitUnknown += 1;
      buckets.unit_alignment = (buckets.unit_alignment ?? 0) + 1;
    } else if (isMetric) {
      metricProfile += 1;
      buckets.metric_profile_gap = (buckets.metric_profile_gap ?? 0) + 1;
    } else if (onlyOptionalAmbiguity || (hasAmbRange && reasons.includes("blocking_warning") && reasons.length <= 2)) {
      rangeOnly += 1;
      buckets.range_only_ambiguity = (buckets.range_only_ambiguity ?? 0) + 1;
    } else if (reasons.includes("blocking_warning")) {
      blockingOnly += 1;
      buckets.blocking_warning = (buckets.blocking_warning ?? 0) + 1;
    } else {
      other += 1;
      buckets[`other:${reasons.sort().join("+")}`] = (buckets[`other:${reasons.sort().join("+")}`] ?? 0) + 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        matched: draft.results.length,
        unmatched: draft.unmatched.length,
        autoPublishable: part.autoPublishable.length,
        reviewRequired: part.reviewRequired.length,
        reasonCounts,
        classification: {
          inequality,
          unit_alignment: unitUnknown,
          metric_profile_gap: metricProfile,
          range_only_ambiguity: rangeOnly,
          blocking_warning: blockingOnly,
          other,
        },
        buckets,
        comparators,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(String(e).slice(0, 200));
  process.exit(1);
});
