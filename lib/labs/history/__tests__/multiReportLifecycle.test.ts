/**
 * Synthetic multi-report lifecycle — collection-date history authority.
 * Structural assertions only; no PHI.
 */

import { extractQuestLabReportDraft } from "../../extraction/extractQuestLabReportDraft";
import { calculateLabMetricChange, formatLabMetricChangeCopy } from "../calculateLabMetricChange";
import {
  evaluateLabTrendEligibility,
  sortLabHistoryByCollectionDate,
} from "../evaluateLabTrendEligibility";
import {
  buildLabHistoryPointIdentityInput,
  computeLabHistoryPointId,
} from "../historyPointIdentity";
import { MULTI_REPORT_SYNTHETIC_BY_YEAR } from "../__fixtures__/multiReportSynthetic";

const CHECKSUM = "a".repeat(64);

function draftFromPages(args: {
  documentId: string;
  pages: readonly { pageNumber: number; text: string }[];
  uploadedAt: string;
}) {
  return extractQuestLabReportDraft({
    documentId: args.documentId,
    userId: "uid_lifecycle",
    draftId: `draft_${args.documentId}`,
    checksumSha256: CHECKSUM,
    pages: [...args.pages],
    createdAt: args.uploadedAt,
  });
}

describe("synthetic multi-report lifecycle (Phase 3D-B)", () => {
  it("orders history by collection date regardless of upload order", () => {
    // Upload order: 2024-style absent; use 2022 then 2020 then 2021 (reverse of timeline).
    const uploaded2022 = draftFromPages({
      documentId: "doc_2022",
      pages: MULTI_REPORT_SYNTHETIC_BY_YEAR[2022].standard,
      uploadedAt: "2026-08-06T10:00:00.000Z",
    });
    const uploaded2020 = draftFromPages({
      documentId: "doc_2020",
      pages: MULTI_REPORT_SYNTHETIC_BY_YEAR[2020].standard,
      uploadedAt: "2026-08-06T11:00:00.000Z",
    });
    const uploaded2021 = draftFromPages({
      documentId: "doc_2021",
      pages: MULTI_REPORT_SYNTHETIC_BY_YEAR[2021].qualitativeAntibody,
      uploadedAt: "2026-08-06T12:00:00.000Z",
    });

    const points = sortLabHistoryByCollectionDate([
      {
        id: "p2022",
        collectedAt: uploaded2022.reportCandidate.collectedAt ?? null,
        uploadedAt: "2026-08-06T10:00:00.000Z",
      },
      {
        id: "p2020",
        collectedAt: uploaded2020.reportCandidate.collectedAt ?? null,
        uploadedAt: "2026-08-06T11:00:00.000Z",
      },
      {
        id: "p2021",
        collectedAt: uploaded2021.reportCandidate.collectedAt ?? null,
        uploadedAt: "2026-08-06T12:00:00.000Z",
      },
    ]);

    expect(points.map((p) => p.id)).toEqual(["p2022", "p2021", "p2020"]);
    expect(uploaded2020.reportCandidate.collectedAtSource?.sourceCalendarDate).toBe("2020-09-24");
    expect(uploaded2021.reportCandidate.collectedAtSource?.sourceCalendarDate).toBe("2021-04-13");
    expect(uploaded2022.reportCandidate.collectedAtSource?.sourceCalendarDate).toBe("2022-07-07");
  });

  it("assigns distinct history identities across documents for the same metric", () => {
    const d2020 = draftFromPages({
      documentId: "doc_a",
      pages: MULTI_REPORT_SYNTHETIC_BY_YEAR[2020].standard,
      uploadedAt: "2026-08-01T00:00:00.000Z",
    });
    const d2022 = draftFromPages({
      documentId: "doc_b",
      pages: MULTI_REPORT_SYNTHETIC_BY_YEAR[2022].standard,
      uploadedAt: "2026-08-02T00:00:00.000Z",
    });

    const ldl2020 = d2020.results.find((r) => r.aliasMatch.canonicalMetricId === "ldl_c");
    const ldl2022 = d2022.results.find((r) => r.aliasMatch.canonicalMetricId === "ldl_c");
    expect(ldl2020).toBeTruthy();
    expect(ldl2022).toBeTruthy();

    const id2020 = computeLabHistoryPointId(
      buildLabHistoryPointIdentityInput({
        userId: "uid_lifecycle",
        canonicalMetricId: "ldl_c",
        sourceDocumentId: "doc_a",
        sourceCandidateId: ldl2020!.id,
        sourceCalendarDate: d2020.reportCandidate.collectedAtSource!.sourceCalendarDate,
        panelId: ldl2020!.panelId,
        specimenType: "serum",
        methodId: null,
        measuredOrCalculated: "measured",
      }),
    );
    const id2022 = computeLabHistoryPointId(
      buildLabHistoryPointIdentityInput({
        userId: "uid_lifecycle",
        canonicalMetricId: "ldl_c",
        sourceDocumentId: "doc_b",
        sourceCandidateId: ldl2022!.id,
        sourceCalendarDate: d2022.reportCandidate.collectedAtSource!.sourceCalendarDate,
        panelId: ldl2022!.panelId,
        specimenType: "serum",
        methodId: null,
        measuredOrCalculated: "measured",
      }),
    );
    expect(id2020).not.toBe(id2022);
  });

  it("computes neutral change between 2022 and 2020 LDL when both equality numeric", () => {
    const d2020 = draftFromPages({
      documentId: "doc_a",
      pages: MULTI_REPORT_SYNTHETIC_BY_YEAR[2020].standard,
      uploadedAt: "2026-08-01T00:00:00.000Z",
    });
    const d2022 = draftFromPages({
      documentId: "doc_b",
      pages: MULTI_REPORT_SYNTHETIC_BY_YEAR[2022].standard,
      uploadedAt: "2026-08-02T00:00:00.000Z",
    });
    const ldl2020 = d2020.results.find(
      (r) =>
        r.aliasMatch.canonicalMetricId === "ldl_c" &&
        r.result?.kind === "numeric" &&
        r.result.comparator === "eq",
    );
    const ldl2022 = d2022.results.find(
      (r) =>
        r.aliasMatch.canonicalMetricId === "ldl_c" &&
        r.result?.kind === "numeric" &&
        r.result.comparator === "eq",
    );
    expect(ldl2020?.result?.kind).toBe("numeric");
    expect(ldl2022?.result?.kind).toBe("numeric");
    if (ldl2020?.result?.kind !== "numeric" || ldl2022?.result?.kind !== "numeric") return;

    const change = calculateLabMetricChange({
      latest: {
        id: "latest",
        collectedAt: d2022.reportCandidate.collectedAt!,
        result: {
          kind: "numeric",
          value: ldl2022.result.value,
          comparator: "eq",
        },
      },
      prior: {
        id: "prior",
        collectedAt: d2020.reportCandidate.collectedAt!,
        result: {
          kind: "numeric",
          value: ldl2020.result.value,
          comparator: "eq",
        },
      },
    });
    expect(change).not.toBeNull();
    expect(change!.interpretation).toBeNull();
    expect(change!.elapsedDays).not.toBeNull();
    const copy = formatLabMetricChangeCopy({ change: change!, unit: "mg/dL" });
    expect(copy.toLowerCase()).not.toMatch(/improv|worsen|better|worse|healthy|optimal|risk/);
  });

  it("keeps qualitative antibody results table-only (no numeric conversion)", () => {
    const draft = draftFromPages({
      documentId: "doc_2021",
      pages: MULTI_REPORT_SYNTHETIC_BY_YEAR[2021].qualitativeAntibody,
      uploadedAt: "2026-08-06T12:00:00.000Z",
    });
    const qualitative = [...draft.results, ...draft.unmatched].filter((r) => {
      const result = "result" in r ? r.result : null;
      return result?.kind === "qualitative" || /POSITIVE|NEGATIVE|REACTIVE/i.test(r.rawResult);
    });
    expect(qualitative.length).toBeGreaterThan(0);
    for (const row of draft.results) {
      if (row.result?.kind === "qualitative") {
        expect(
          evaluateLabTrendEligibility({
            result: row.result,
            normalizedUnit: row.unit.normalizedUnit,
            collectedAt: draft.reportCandidate.collectedAt ?? null,
          }),
        ).toBe("qualitative");
      }
      expect(row.result?.kind).not.toBe("numeric");
    }
  });

  it("never uses uploadedAt as collection date on extracted drafts", () => {
    const uploadedAt = "2026-08-06T18:00:00.000Z";
    const draft = draftFromPages({
      documentId: "doc_2020_basic",
      pages: MULTI_REPORT_SYNTHETIC_BY_YEAR[2020].basicHealthProfile,
      uploadedAt,
    });
    expect(draft.reportCandidate.collectedAt).not.toBe(uploadedAt);
    expect(draft.reportCandidate.collectedAtSource?.sourceCalendarDate).toBe("2020-06-05");
    expect(draft.reportCandidate.collectedAt?.startsWith("2020-06-05")).toBe(true);
  });
});
