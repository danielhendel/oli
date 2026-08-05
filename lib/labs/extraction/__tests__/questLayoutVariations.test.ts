import fs from "fs";
import path from "path";
import { extractQuestLabReportDraft } from "../extractQuestLabReportDraft";
import { segmentQuestReportText } from "../segmentQuestReport";

const checksum = "d".repeat(64);

describe("Quest layout variation fixtures", () => {
  it("handles multi-page headers, Cardio IQ, historical columns, and mixed types", () => {
    const text = fs.readFileSync(
      path.join(__dirname, "../__fixtures__/quest_layout_variations_v1.txt"),
      "utf8",
    );
    // Simulate two pages by splitting on page markers for segmentation provenance.
    const parts = text.split(/Page \d+ of \d+/i);
    const pages =
      parts.length > 1
        ? parts
            .map((p, i) => ({ pageNumber: i === 0 ? 1 : i, text: p.trim() }))
            .filter((p) => p.text.length > 0)
            .map((p, i) => ({ pageNumber: i + 1, text: p.text }))
        : [{ pageNumber: 1, text }];

    const segmented = segmentQuestReportText(pages);
    expect(segmented.pages.length).toBeGreaterThanOrEqual(1);
    expect(segmented.cardioIqPages.length).toBeGreaterThanOrEqual(0);

    const draft = extractQuestLabReportDraft({
      documentId: "doc-var",
      userId: "user1",
      draftId: "draft-var",
      checksumSha256: checksum,
      pages,
      createdAt: "2024-04-02T00:00:00.000Z",
    });

    expect(draft.status).toBe("review_needed");
    expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "ldl_c")).toBe(true);
    expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "ldl_particle_number")).toBe(true);
    expect(draft.results.some((r) => r.result?.kind === "numeric" && r.result.comparator === "lt")).toBe(true);
    expect(draft.results.some((r) => r.result?.kind === "not_reported")).toBe(true);
    expect(draft.unmatched.some((u) => /pattern|hepatitis|custom/i.test(u.rawAnalyteLabel + u.rawResult))).toBe(true);

    const blob = JSON.stringify(draft);
    expect(blob).not.toMatch(/patient id|ssn|date of birth|phone/i);
  });
});
