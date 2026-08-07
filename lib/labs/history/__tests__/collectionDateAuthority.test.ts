import { calculateLabMetricChange } from "../calculateLabMetricChange";
import { deduplicateLabHistorySourceRepresentations } from "../deduplicateLabHistorySourceRepresentations";
import {
  evaluateLabTrendEligibility,
  sortLabHistoryByCollectionDate,
} from "../evaluateLabTrendEligibility";
import {
  buildLabHistoryPointIdentityInput,
  computeLabHistoryPointFingerprint,
  computeLabHistoryPointId,
} from "../historyPointIdentity";
import {
  formatLabCalendarDate,
  historyTimestampFromAccepted,
  isHistoryEligibleCollectionTimestamp,
  parseLabSourceTimestampFromQuestRaw,
} from "../labSourceTimestamp";

describe("collection date authority", () => {
  it("orders history by collectedAt descending and ignores uploadedAt", () => {
    const sorted = sortLabHistoryByCollectionDate([
      {
        id: "older",
        collectedAt: "2020-06-05T00:00:00.000Z",
        uploadedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "latest",
        collectedAt: "2024-10-15T06:16:00.000Z",
        uploadedAt: "2020-01-01T00:00:00.000Z",
      },
      {
        id: "middle",
        collectedAt: "2022-07-07T00:00:00.000Z",
        uploadedAt: "2025-06-01T00:00:00.000Z",
      },
    ]);
    expect(sorted.map((row) => row.id)).toEqual(["latest", "middle", "older"]);
  });

  it("preserves date-only calendar dates without timezone shift", () => {
    const parsed = parseLabSourceTimestampFromQuestRaw("07/07/2022");
    expect(parsed).toMatchObject({
      sourceCalendarDate: "2022-07-07",
      precision: "date_only",
      instant: null,
    });
    expect(formatLabCalendarDate(parsed!.sourceCalendarDate)).toBe("Jul 7, 2022");
  });

  it("preserves CDT datetime calendar date from source fields", () => {
    const parsed = parseLabSourceTimestampFromQuestRaw("10/15/2024 / 06:16 CDT");
    expect(parsed).toMatchObject({
      sourceRaw: "10/15/2024 / 06:16 CDT",
      sourceCalendarDate: "2024-10-15",
      precision: "date_time_with_timezone",
      timezoneName: "CDT",
      timezoneOffset: "-05:00",
      instant: "2024-10-15T06:16:00.000Z",
    });
    expect(formatLabCalendarDate(parsed!.sourceCalendarDate)).toBe("Oct 15, 2024");
  });

  it("blocks history eligibility when collectedAt is missing", () => {
    expect(
      evaluateLabTrendEligibility({
        result: { kind: "numeric", comparator: "eq" },
        normalizedUnit: "mg/dL",
        collectedAt: null,
      }),
    ).toBe("missing_collection_date");

    expect(
      historyTimestampFromAccepted(null, "date_only", "2024-10-15"),
    ).toEqual({ calendarDate: null, eligible: false });

    expect(isHistoryEligibleCollectionTimestamp(null)).toBe(false);
    expect(isHistoryEligibleCollectionTimestamp(undefined)).toBe(false);
  });

  it("does not reorder timeline by upload order", () => {
    const firstUpload = {
      id: "uploaded_first",
      collectedAt: "2022-07-07T00:00:00.000Z",
      uploadedAt: "2020-01-01T00:00:00.000Z",
    };
    const secondUpload = {
      id: "uploaded_second",
      collectedAt: "2024-10-15T00:00:00.000Z",
      uploadedAt: "2026-01-01T00:00:00.000Z",
    };
    const shuffled = [firstUpload, secondUpload];
    const sorted = sortLabHistoryByCollectionDate(shuffled);
    expect(sorted.map((row) => row.id)).toEqual(["uploaded_second", "uploaded_first"]);
  });

  it("produces different history point ids for same metric/date across documents", () => {
    const shared = {
      userId: "user_a",
      canonicalMetricId: "ldl_c",
      sourceCalendarDate: "2024-10-15",
      panelId: "lipid",
      specimenType: "serum",
      methodId: null,
      measuredOrCalculated: "measured",
    };
    const docOne = buildLabHistoryPointIdentityInput({
      ...shared,
      sourceDocumentId: "doc_one",
      sourceCandidateId: "cand_one",
    });
    const docTwo = buildLabHistoryPointIdentityInput({
      ...shared,
      sourceDocumentId: "doc_two",
      sourceCandidateId: "cand_two",
    });
    expect(computeLabHistoryPointId(docOne)).not.toBe(computeLabHistoryPointId(docTwo));
  });

  it("produces stable identity for the same source candidate", () => {
    const input = buildLabHistoryPointIdentityInput({
      userId: "user_a",
      canonicalMetricId: "ldl_c",
      sourceDocumentId: "doc_one",
      sourceCandidateId: "cand_one",
      sourceCalendarDate: "2024-10-15",
      panelId: "lipid",
      specimenType: "serum",
      methodId: null,
      measuredOrCalculated: "measured",
    });
    expect(computeLabHistoryPointId(input)).toBe(computeLabHistoryPointFingerprint(input));
    expect(computeLabHistoryPointId(input)).toBe(computeLabHistoryPointId({ ...input }));
  });

  it("ignores value and upload date in history point identity", () => {
    const base = buildLabHistoryPointIdentityInput({
      userId: "user_a",
      canonicalMetricId: "ldl_c",
      sourceDocumentId: "doc_one",
      sourceCandidateId: "cand_one",
      sourceCalendarDate: "2024-10-15",
      panelId: "lipid",
      specimenType: "serum",
      methodId: null,
      measuredOrCalculated: "measured",
    });
    const sameIdentity = buildLabHistoryPointIdentityInput({
      userId: "user_a",
      canonicalMetricId: "ldl_c",
      sourceDocumentId: "doc_one",
      sourceCandidateId: "cand_one",
      sourceCalendarDate: "2024-10-15",
      panelId: "lipid",
      specimenType: "serum",
      methodId: null,
      measuredOrCalculated: "measured",
    });
    expect(computeLabHistoryPointId(base)).toBe(computeLabHistoryPointId(sameIdentity));
  });

  it("calculates absolute, percent, unchanged, zero prior, and elapsedDays", () => {
    const increased = calculateLabMetricChange({
      latest: {
        id: "latest",
        collectedAt: "2024-10-15T00:00:00.000Z",
        result: { kind: "numeric", value: 112, comparator: "eq" },
      },
      prior: {
        id: "prior",
        collectedAt: "2022-07-07T00:00:00.000Z",
        result: { kind: "numeric", value: 100, comparator: "eq" },
      },
    });
    expect(increased).toMatchObject({
      absoluteChange: 12,
      percentChange: 12,
      direction: "increased",
      elapsedDays: 831,
      interpretation: null,
    });

    const unchanged = calculateLabMetricChange({
      latest: {
        id: "latest",
        collectedAt: "2024-10-15T00:00:00.000Z",
        result: { kind: "numeric", value: 100, comparator: "eq" },
      },
      prior: {
        id: "prior",
        collectedAt: "2022-07-07T00:00:00.000Z",
        result: { kind: "numeric", value: 100, comparator: "eq" },
      },
    });
    expect(unchanged).toMatchObject({
      absoluteChange: 0,
      percentChange: 0,
      direction: "unchanged",
    });

    const zeroPrior = calculateLabMetricChange({
      latest: {
        id: "latest",
        collectedAt: "2024-10-15T00:00:00.000Z",
        result: { kind: "numeric", value: 50, comparator: "eq" },
      },
      prior: {
        id: "prior",
        collectedAt: "2022-07-07T00:00:00.000Z",
        result: { kind: "numeric", value: 0, comparator: "eq" },
      },
    });
    expect(zeroPrior?.percentChange).toBeNull();
    expect(zeroPrior?.absoluteChange).toBe(50);
  });

  it("marks qualitative, pattern, and inequality results as table-only eligibility", () => {
    const collectedAt = "2024-10-15T00:00:00.000Z";
    expect(
      evaluateLabTrendEligibility({
        result: { kind: "qualitative" },
        normalizedUnit: "none",
        collectedAt,
      }),
    ).toBe("qualitative");
    expect(
      evaluateLabTrendEligibility({
        result: { kind: "pattern" },
        normalizedUnit: "none",
        collectedAt,
      }),
    ).toBe("pattern");
    expect(
      evaluateLabTrendEligibility({
        result: { kind: "numeric", comparator: "lt" },
        normalizedUnit: "ug/L",
        collectedAt,
      }),
    ).toBe("inequality_table_only");
  });

  it("does not collapse cross-document same-day representations when document ids differ", () => {
    const out = deduplicateLabHistorySourceRepresentations([
      {
        id: "doc_a_row",
        canonicalMetricId: "ldl_c",
        collectedAt: "2024-10-15T00:00:00.000Z",
        panelId: "lipid",
        specimenType: "serum",
        methodId: null,
        sourceDocumentId: "doc_a",
        sourceCandidateId: "cand_a",
        sourcePage: 1,
        sourceLocator: "p1:L1",
        resultFingerprint: "eq:101",
      },
      {
        id: "doc_b_row",
        canonicalMetricId: "ldl_c",
        collectedAt: "2024-10-15T00:00:00.000Z",
        panelId: "lipid",
        specimenType: "serum",
        methodId: null,
        sourceDocumentId: "doc_b",
        sourceCandidateId: "cand_b",
        sourcePage: 1,
        sourceLocator: "p1:L1",
        resultFingerprint: "eq:101",
      },
    ]);
    expect(out).toHaveLength(2);
  });

  it("collapses same document and candidate representations", () => {
    const out = deduplicateLabHistorySourceRepresentations([
      {
        id: "page_6",
        canonicalMetricId: "ldl_c",
        collectedAt: "2024-10-15T00:00:00.000Z",
        panelId: "lipid",
        specimenType: "serum",
        methodId: null,
        sourceDocumentId: "doc_a",
        sourceCandidateId: "cand_a",
        sourcePage: 6,
        sourceLocator: "p6:L1",
        resultFingerprint: "eq:101",
      },
      {
        id: "page_9",
        canonicalMetricId: "ldl_c",
        collectedAt: "2024-10-15T00:00:00.000Z",
        panelId: "lipid",
        specimenType: "serum",
        methodId: null,
        sourceDocumentId: "doc_a",
        sourceCandidateId: "cand_a",
        sourcePage: 9,
        sourceLocator: "p9:L1",
        resultFingerprint: "eq:101",
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("page_9");
  });

  it("accepts eligible history timestamps from accepted results", () => {
    expect(
      historyTimestampFromAccepted("2024-10-15T06:16:00.000Z", "date_time_with_timezone", "2024-10-15"),
    ).toEqual({ calendarDate: "2024-10-15", eligible: true });

    const source = parseLabSourceTimestampFromQuestRaw("07/07/2022");
    expect(isHistoryEligibleCollectionTimestamp(source)).toBe(true);
  });
});
