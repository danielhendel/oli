/**
 * Final signed-in stabilization regressions (synthetic).
 */
import { describe, expect, it } from "@jest/globals";
import { formatLabSourceCalendarDate, isLabReferenceLikeDisplayRow } from "../../labSourceDisplay";
import { parseColumnsForTest } from "../extractQuestAnalyteRows";
import { extractQuestLabReportDraft } from "../extractQuestLabReportDraft";

describe("lab source calendar date formatting", () => {
  it("does not shift Quest UTC wall dates to the previous local day", () => {
    expect(formatLabSourceCalendarDate("2024-10-15T00:00:00.000Z")).toBe("Oct 15, 2024");
    expect(formatLabSourceCalendarDate("2024-10-26T00:00:00.000Z")).toBe("Oct 26, 2024");
    expect(formatLabSourceCalendarDate("2024-10-15T06:16:00.000Z")).toBe("Oct 15, 2024");
    expect(formatLabSourceCalendarDate("2024-10-26T13:29:00.000Z")).toBe("Oct 26, 2024");
  });
});

describe("reference-like display filter", () => {
  it("keeps current_result inequalities and suppresses legacy threshold text", () => {
    expect(
      isLabReferenceLikeDisplayRow({
        sourceValueRole: "current_result",
        rawValueText: "<4",
        comparator: "lt",
      }),
    ).toBe(false);
    expect(
      isLabReferenceLikeDisplayRow({
        sourceValueRole: "reference_optimal",
        rawValueText: "<130",
        comparator: "lt",
      }),
    ).toBe(true);
    expect(
      isLabReferenceLikeDisplayRow({
        sourceValueRole: null,
        rawValueText: "<130",
      }),
    ).toBe(true);
  });
});

describe("Quest CDT timestamp parse", () => {
  it("keeps source calendar day for Collected with CDT wall time", () => {
    const draft = extractQuestLabReportDraft({
      documentId: "doc_ts",
      userId: "u",
      draftId: "d",
      checksumSha256: "c".repeat(64),
      pages: [
        {
          pageNumber: 1,
          text: [
            "Quest Diagnostics",
            "DirectLabs Laboratory Report",
            "Report Status: FINAL",
            "Collected: 10/15/2024 / 06:16 CDT",
            "Reported: 10/26/2024 / 13:29 CDT",
            "Fasting: Yes",
            "LIPID PANEL",
            "CHOLESTEROL, TOTAL 180 <200 mg/dL",
          ].join("\n"),
        },
      ],
      createdAt: "2024-10-15T12:00:00.000Z",
    });
    expect(draft.reportCandidate.collectedAt?.startsWith("2024-10-15")).toBe(true);
    expect(draft.reportCandidate.reportedAt?.startsWith("2024-10-26")).toBe(true);
    expect(formatLabSourceCalendarDate(draft.reportCandidate.collectedAt)).toBe("Oct 15, 2024");
    expect(formatLabSourceCalendarDate(draft.reportCandidate.reportedAt)).toBe("Oct 26, 2024");
  });
});

describe("IL-6 numeral guard extras", () => {
  it("skips IL6 glued alias after name numeral", () => {
    const parsed = parseColumnsForTest("INTERLEUKIN 6 IL6 1.55 <5.00 pg/mL");
    expect(parsed?.rawResult).toBe("1.55");
  });
});
