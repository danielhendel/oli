#!/usr/bin/env npx tsx
/**
 * Private structural inventory of Report A candidates.
 * NEVER commit output. NEVER print raw values or private identifiers.
 * Prints de-identified structural aggregates + hashed label tokens only when --detail.
 *
 * Usage:
 *   npx tsx --tsconfig services/api/tsconfig.json \
 *     scripts/labs/inventory-report-candidates.cli.ts --pdf /abs/path.pdf [--detail]
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractPdfTextPages } from "../../services/api/src/lib/labs/pdfTextExtraction";
import { extractQuestLabReportDraft } from "../../lib/labs/extraction/extractQuestLabReportDraft";
import { partitionLabCandidatesForAutoPublish } from "../../lib/labs/autoPublish/partitionLabAutoPublish";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}

function token(label: string): string {
  const n = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  const h = createHash("sha256").update(label).digest("hex").slice(0, 8);
  return `${n || "empty"}#${h}`;
}

async function main() {
  const pdfPath = arg("--pdf");
  const detail = process.argv.includes("--detail");
  const outPath = arg("--out");
  if (!pdfPath) {
    console.error("Usage: --pdf /abs/path.pdf [--detail] [--out /tmp/inv.json]");
    process.exit(2);
  }
  const abs = resolve(pdfPath);
  if (!existsSync(abs)) {
    console.error(JSON.stringify({ ok: false, error: "FILE_NOT_FOUND" }));
    process.exit(1);
  }

  const bytes = new Uint8Array(readFileSync(abs));
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const extraction = await extractPdfTextPages(bytes);
  const draft = extractQuestLabReportDraft({
    documentId: "inv_doc",
    userId: "inv_user",
    draftId: "inv_draft",
    checksumSha256,
    pages: extraction.pages,
    createdAt: new Date().toISOString(),
  });
  const partition = partitionLabCandidatesForAutoPublish(draft);

  const unmatchedRows = draft.unmatched.map((u) => ({
    token: token(u.rawAnalyteLabel),
    reason: u.reason,
    page: u.provenance.sourcePage,
    confidence: u.confidence,
    reviewStatus: u.reviewStatus,
  }));

  const matchedRows = draft.results.map((r) => ({
    token: token(r.rawAnalyteLabel),
    metricId: r.aliasMatch.canonicalMetricId,
    kind: r.result?.kind ?? null,
    comparator: r.result?.kind === "numeric" ? r.result.comparator : null,
    unitKnown: r.unit.known,
    hasUnit: Boolean(r.unit.normalizedUnit),
    page: r.provenance.sourcePage,
    panelId: r.panelId,
    warnings: r.warnings,
    matchMethod: r.aliasMatch.matchMethod,
  }));

  // Aggregate unmatched by normalized token family (strip hash for grouping display)
  const unmatchedByReason: Record<string, number> = {};
  const unmatchedTokens: string[] = [];
  for (const u of unmatchedRows) {
    unmatchedByReason[u.reason] = (unmatchedByReason[u.reason] ?? 0) + 1;
    unmatchedTokens.push(u.token);
  }

  const matchedByMetric: Record<string, number> = {};
  for (const m of matchedRows) {
    const id = m.metricId ?? "null";
    matchedByMetric[id] = (matchedByMetric[id] ?? 0) + 1;
  }

  const total = draft.results.length + draft.unmatched.length;
  const summary = {
    ok: true,
    totalCandidates: total,
    matchedCount: draft.results.length,
    unmatchedCount: draft.unmatched.length,
    autoImported: partition.autoPublishable.length,
    systemVerified: partition.systemVerifiable.length,
    withheld: partition.withheld.length,
    panels: draft.panels.map((p) => ({
      idToken: token(p.name),
      page: p.sourcePage,
    })),
    unmatchedByReason,
    matchedByMetric,
    unmatchedTokens: unmatchedTokens.sort(),
    detail: detail
      ? {
          unmatched: unmatchedRows,
          matched: matchedRows.map((m) => ({
            token: m.token,
            metricId: m.metricId,
            kind: m.kind,
            comparator: m.comparator,
            page: m.page,
            panelId: m.panelId,
            unitKnown: m.unitKnown,
            hasUnit: m.hasUnit,
            matchMethod: m.matchMethod,
            warningCount: m.warnings.length,
          })),
        }
      : undefined,
  };

  const json = JSON.stringify(summary, null, 2);
  if (outPath) {
    writeFileSync(outPath, json);
    console.log(JSON.stringify({ ok: true, wrote: "local_only", totalCandidates: total, unmatchedCount: draft.unmatched.length }));
  } else {
    console.log(json);
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e?.message ?? e).slice(0, 80) }));
  process.exit(1);
});
