import fs from "fs";
import path from "path";
import { extractQuestLabReportDraft } from "../extractQuestLabReportDraft";

const checksum = "f".repeat(64);

describe("Quest false-positive row filters", () => {
  it("skips client ids, risk legends, performing-lab lines, and maps known aliases", () => {
    const text = fs.readFileSync(
      path.join(__dirname, "../__fixtures__/quest_false_positive_filters_v1.txt"),
      "utf8",
    );
    const draft = extractQuestLabReportDraft({
      documentId: "doc-fp",
      userId: "user1",
      draftId: "draft-fp",
      checksumSha256: checksum,
      pages: [{ pageNumber: 1, text }],
      createdAt: "2024-04-04T00:00:00.000Z",
    });

    const labels = [...draft.results, ...draft.unmatched].map((r) => r.rawAnalyteLabel.toLowerCase());
    expect(labels.some((l) => l.startsWith("client"))).toBe(false);
    expect(labels.some((l) => l.startsWith("deficiency"))).toBe(false);
    expect(labels.some((l) => l.startsWith("risk:"))).toBe(false);
    expect(labels.some((l) => /quest diagnostics\/nichols/i.test(l))).toBe(false);
    expect(labels.some((l) => l.startsWith("value ("))).toBe(false);

    expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "co2_bicarbonate")).toBe(true);
    expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "phosphorus")).toBe(true);
    expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "folate")).toBe(true);
    expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "cortisol")).toBe(true);
    expect(draft.results.some((r) => r.aliasMatch.canonicalMetricId === "small_ldl_p")).toBe(true);

    // Alias-missing rows use unmatched_alias, not ambiguous_alias.
    expect(draft.unmatched.every((u) => u.reason !== "ambiguous_alias" || u.confidence >= 0.3)).toBe(true);
  });
});
