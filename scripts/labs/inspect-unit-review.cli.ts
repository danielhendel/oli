import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { extractPdfTextPages } from "../../services/api/src/lib/labs/pdfTextExtraction";
import { extractQuestLabReportDraft } from "../../lib/labs/extraction/extractQuestLabReportDraft";
import { partitionLabCandidatesForAutoPublish } from "../../lib/labs/autoPublish/partitionLabAutoPublish";

async function main() {
  const abs = process.argv[2]!;
  const bytes = new Uint8Array(readFileSync(abs));
  const extraction = await extractPdfTextPages(bytes);
  const draft = extractQuestLabReportDraft({
    documentId: "d",
    userId: "u",
    draftId: "dr",
    checksumSha256: createHash("sha256").update(bytes).digest("hex"),
    pages: extraction.pages,
    createdAt: new Date().toISOString(),
  });
  const part = partitionLabCandidatesForAutoPublish(draft);
  const rows = part.reviewRequired
    .filter((x) => x.decision.reasons.includes("unit_unknown") || x.decision.reasons.includes("unit_incompatible"))
    .map((x) => ({
      metric: x.candidate.aliasMatch.canonicalMetricId,
      cmp: x.candidate.result?.kind === "numeric" ? x.candidate.result.comparator : null,
      rawUnit: x.candidate.unit.rawUnit,
      known: x.candidate.unit.known,
      reasons: x.decision.reasons,
      warnings: x.candidate.warnings,
    }));
  console.log(JSON.stringify(rows, null, 2));
}
main();
