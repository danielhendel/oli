import fs from "fs";
import path from "path";
import { extractQuestLabReportDraft } from "../extractQuestLabReportDraft";

const checksum = "e".repeat(64);

describe("Quest single-space row grammar", () => {
  it("parses pdfjs-style single-space analyte columns", () => {
    const text = fs.readFileSync(
      path.join(__dirname, "../__fixtures__/quest_single_space_rows_v1.txt"),
      "utf8",
    );
    const draft = extractQuestLabReportDraft({
      documentId: "doc-ss",
      userId: "user1",
      draftId: "draft-ss",
      checksumSha256: checksum,
      pages: [{ pageNumber: 1, text }],
      createdAt: "2024-04-03T00:00:00.000Z",
    });

    expect(draft.status).toBe("review_needed");
    expect(draft.results.length + draft.unmatched.length).toBeGreaterThanOrEqual(8);
    expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "ldl_c")).toBe(true);
    expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "hdl_c")).toBe(true);
    expect(
      draft.results.some((r) => r.aliasMatch.canonicalMetricId === "total_testosterone") ||
        draft.unmatched.some((u) => /testosterone/i.test(u.rawAnalyteLabel)),
    ).toBe(true);
    expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "vitamin_d")).toBe(true);
    expect(draft.results.some((r) => r.unit.rawUnit === "mg/dL" || r.unit.normalizedUnit === "mg/dL")).toBe(
      true,
    );
    // Performing-lab trailing codes must not become the result value.
    expect(draft.results.every((r) => !/^AMD$/i.test(r.rawResult))).toBe(true);
  });
});
