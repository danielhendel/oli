/**
 * April 2021 qualitative completeness — accepted results + history identity.
 */
import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { extractQuestLabReportDraft } from "../extractQuestLabReportDraft";
import {
  buildLabImportSummary,
  partitionLabCandidatesForAutoPublish,
} from "../../autoPublish/partitionLabAutoPublish";
import {
  buildLabHistoryPointIdentityInput,
  computeLabHistoryPointId,
} from "../../history/historyPointIdentity";
import { evaluateLabTrendEligibility } from "../../history/evaluateLabTrendEligibility";

const FIXTURES = resolve(__dirname, "../__fixtures__");

function draftFromFixture(name: string) {
  const text = readFileSync(resolve(FIXTURES, `${name}.txt`), "utf8");
  return extractQuestLabReportDraft({
    documentId: "doc_apr2021",
    userId: "user_test",
    draftId: "draft_apr2021",
    checksumSha256: "a".repeat(64),
    pages: [{ pageNumber: 1, text }],
    createdAt: "2026-08-07T00:00:00.000Z",
  });
}

describe("April 2021 qualitative completeness", () => {
  it("imports exactly two qualitative SARS results into history-ready identities", () => {
    const draft = draftFromFixture("quest_2021_qualitative_antibody_v1");
    expect(draft.reportCandidate.collectedAtSource?.sourceCalendarDate).toBe("2021-04-13");

    const qualitative = draft.results.filter(
      (r) =>
        (r.aliasMatch.canonicalMetricId === "sars_cov2_igg" ||
          r.aliasMatch.canonicalMetricId === "sars_cov2_igm") &&
        r.result?.kind === "qualitative",
    );
    expect(qualitative).toHaveLength(2);
    expect(qualitative.every((r) => r.result?.kind === "qualitative" && r.result.value === "positive")).toBe(
      true,
    );

    const partition = partitionLabCandidatesForAutoPublish(draft);
    expect(partition.autoPublishable).toHaveLength(2);
    const summary = buildLabImportSummary({ documentId: "doc_apr2021", draft, partition });
    expect(summary.importedCount).toBe(2);

    const ids = qualitative.map((r) =>
      computeLabHistoryPointId(
        buildLabHistoryPointIdentityInput({
          userId: "user_test",
          canonicalMetricId: r.aliasMatch.canonicalMetricId,
          sourceCalendarDate: "2021-04-13",
          sourceDocumentId: "doc_apr2021",
          sourceCandidateId: r.id,
        }),
      ),
    );
    expect(new Set(ids).size).toBe(2);

    for (const row of qualitative) {
      expect(
        evaluateLabTrendEligibility({
          result: row.result!,
          normalizedUnit: row.unit.normalizedUnit,
          collectedAt: draft.reportCandidate.collectedAt ?? null,
        }),
      ).toBe("qualitative");
    }
  });
});
