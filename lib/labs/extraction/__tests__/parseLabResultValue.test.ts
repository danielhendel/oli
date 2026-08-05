import { describe, expect, it } from "@jest/globals";
import { parseLabResultValue } from "../parseLabResultValue";

describe("parseLabResultValue", () => {
  it("parses plain numeric values with eq comparator", () => {
    const outcome = parseLabResultValue("98");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value).toEqual({ kind: "numeric", value: 98, comparator: "eq" });
  });

  it("parses decimal numeric values", () => {
    const outcome = parseLabResultValue("1.0");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value).toEqual({ kind: "numeric", value: 1.0, comparator: "eq" });
  });

  it("never flattens inequalities to bare numbers", () => {
    const outcome = parseLabResultValue("<4");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value).toEqual({ kind: "numeric", value: 4, comparator: "lt" });
  });

  it("preserves >= / <= comparators distinctly", () => {
    const gte = parseLabResultValue(">=5");
    const lte = parseLabResultValue("<=5");
    expect(gte.ok && gte.value).toEqual({ kind: "numeric", value: 5, comparator: "gte" });
    expect(lte.ok && lte.value).toEqual({ kind: "numeric", value: 5, comparator: "lte" });
  });

  it("supports unicode inequality operators", () => {
    const outcome = parseLabResultValue("≤100");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value).toEqual({ kind: "numeric", value: 100, comparator: "lte" });
  });

  it("parses qualitative values and preserves rawValue", () => {
    const outcome = parseLabResultValue("Non-Reactive");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value).toEqual({ kind: "qualitative", value: "non_reactive", rawValue: "Non-Reactive" });
  });

  it("never invents a numeric value from a qualitative string", () => {
    const outcome = parseLabResultValue("POSITIVE");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value.kind).toBe("qualitative");
    expect((outcome.value as { value?: unknown }).value).not.toEqual(expect.any(Number));
  });

  it("parses pattern results", () => {
    const outcome = parseLabResultValue("Pattern B");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value).toEqual({ kind: "pattern", value: "Pattern B" });
  });

  it("parses not_reported reasons", () => {
    const outcome = parseLabResultValue("NOT APPLICABLE");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value).toEqual({ kind: "not_reported", reason: "not_applicable" });
  });

  it("treats empty input as empty (not ambiguous or unsupported)", () => {
    const outcome = parseLabResultValue("   ");
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("empty");
  });

  it("marks free-text with digits as unsupported rather than guessing", () => {
    const outcome = parseLabResultValue("XYZ123abc!!");
    expect(outcome.ok).toBe(false);
  });

  it("parses bare alphabetic text as a low-confidence text value", () => {
    const outcome = parseLabResultValue("See note below");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.value).toEqual({ kind: "text", value: "See note below" });
    expect(outcome.confidence).toBeLessThan(0.95);
  });
});
