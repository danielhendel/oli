import { describe, expect, it } from "@jest/globals";
import { matchLabAnalyteAlias } from "../matchLabAnalyteAlias";

describe("matchLabAnalyteAlias", () => {
  it("matches an exact canonical display name", () => {
    const outcome = matchLabAnalyteAlias("LDL-C");
    expect(outcome.canonicalMetricId).toBe("ldl_c");
    expect(outcome.matchMethod).toBe("exact_canonical");
    expect(outcome.requiresReview).toBe(false);
  });

  it("matches a known Quest-family alias form", () => {
    const outcome = matchLabAnalyteAlias("LDL-CHOLESTEROL");
    expect(outcome.canonicalMetricId).toBe("ldl_c");
    expect(["exact_alias", "normalized_exact"]).toContain(outcome.matchMethod);
  });

  it("matches catalog aliases case-insensitively with punctuation normalized", () => {
    const outcome = matchLabAnalyteAlias("Hemoglobin A1c");
    expect(outcome.canonicalMetricId).toBe("hba1c");
  });

  it("leaves unrecognized analyte labels unmatched and flagged for review", () => {
    const outcome = matchLabAnalyteAlias("SOME CUSTOM MARKER");
    expect(outcome.canonicalMetricId).toBeNull();
    expect(outcome.matchMethod).toBe("unmatched");
    expect(outcome.requiresReview).toBe(true);
  });

  it("leaves empty labels unmatched rather than guessing", () => {
    const outcome = matchLabAnalyteAlias("   ");
    expect(outcome.canonicalMetricId).toBeNull();
    expect(outcome.matchMethod).toBe("unmatched");
    expect(outcome.confidence).toBe(0);
  });

  it("does not perform unsafe fuzzy matching across unrelated markers", () => {
    // A near-miss / partial substring must not resolve to an unrelated canonical metric.
    const outcome = matchLabAnalyteAlias("LDL something totally unrelated marker text");
    expect(outcome.canonicalMetricId).toBeNull();
    expect(outcome.matchMethod).toBe("unmatched");
  });

  it("tags every match with the current alias registry version", () => {
    const matched = matchLabAnalyteAlias("Glucose");
    const unmatched = matchLabAnalyteAlias("Not A Real Marker");
    expect(matched.aliasVersion).toBe(unmatched.aliasVersion);
    expect(matched.aliasVersion.length).toBeGreaterThan(0);
  });
});
