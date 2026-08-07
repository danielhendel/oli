import { describe, expect, it } from "@jest/globals";
import { parseColumnsForTest } from "../extractQuestAnalyteRows";

describe("extractQuestAnalyteRows column grammar", () => {
  it("treats NEGATIVE after POSITIVE as reference range, not unit", () => {
    const parsed = parseColumnsForTest("SARS CoV 2 AB IGG       POSITIVE              NEGATIVE");
    expect(parsed).not.toBeNull();
    expect(parsed?.rawResult).toBe("POSITIVE");
    expect(parsed?.rawUnit).toBeNull();
    expect(parsed?.rawRange).toBe("NEGATIVE");
  });

  it("does not treat SARS CoV 2 AB as a standalone result row", () => {
    expect(parseColumnsForTest("SARS CoV 2 AB")).toBeNull();
  });

  it("does not merge panel header CBC with WBC row labels", () => {
    const parsed = parseColumnsForTest("WBC                      5.8  Thousand/uL  3.8-10.8");
    expect(parsed?.rawLabel).toBe("WBC");
    expect(parsed?.rawResult).toBe("5.8");
  });
});
