import { describe, expect, it } from "@jest/globals";
import { parseLabFlagCandidate } from "../parseLabFlag";

describe("parseLabFlagCandidate", () => {
  it("returns none for missing/empty flags", () => {
    expect(parseLabFlagCandidate(null)).toEqual({
      rawFlag: null,
      normalized: "none",
      source: "report_flag",
      confidence: 1,
    });
    expect(parseLabFlagCandidate(undefined).normalized).toBe("none");
    expect(parseLabFlagCandidate("   ").normalized).toBe("none");
  });

  it("normalizes single-letter high/low flags", () => {
    expect(parseLabFlagCandidate("H").normalized).toBe("high");
    expect(parseLabFlagCandidate("L").normalized).toBe("low");
  });

  it("normalizes critical high/low flags distinctly from high/low", () => {
    expect(parseLabFlagCandidate("HH").normalized).toBe("critical_high");
    expect(parseLabFlagCandidate("LL").normalized).toBe("critical_low");
    expect(parseLabFlagCandidate("Critical High").normalized).toBe("critical_high");
  });

  it("normalizes abnormal and normal flags", () => {
    expect(parseLabFlagCandidate("A").normalized).toBe("abnormal");
    expect(parseLabFlagCandidate("Normal").normalized).toBe("normal");
  });

  it("preserves provider-specific category labels distinctly from Oli classification", () => {
    const outcome = parseLabFlagCandidate("Optimal");
    expect(outcome.normalized).toBe("provider_category");
    expect(outcome.rawFlag).toBe("Optimal");
  });

  it("marks unrecognized flags as unknown rather than guessing", () => {
    const outcome = parseLabFlagCandidate("???");
    expect(outcome.normalized).toBe("unknown");
    expect(outcome.confidence).toBeLessThan(0.5);
  });

  it("always sources flags as report_flag (calculated-from-range is labeled elsewhere)", () => {
    expect(parseLabFlagCandidate("H").source).toBe("report_flag");
  });
});
