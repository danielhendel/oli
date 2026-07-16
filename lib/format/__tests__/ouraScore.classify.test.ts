import {
  classifyOuraProviderScore,
  normalizeOuraScore0to100,
  scoreToRatingLabel,
  tryClassifyOuraScore,
} from "@/lib/format/ouraScore";

describe("normalizeOuraScore0to100", () => {
  it("accepts boundary scores including 0 and 100", () => {
    expect(normalizeOuraScore0to100(0)).toBe(0);
    expect(normalizeOuraScore0to100(100)).toBe(100);
    expect(normalizeOuraScore0to100(85.4)).toBe(85);
  });

  it("rejects invalid inputs", () => {
    expect(normalizeOuraScore0to100(null)).toBeNull();
    expect(normalizeOuraScore0to100(undefined)).toBeNull();
    expect(normalizeOuraScore0to100(Number.NaN)).toBeNull();
    expect(normalizeOuraScore0to100(Infinity)).toBeNull();
    expect(normalizeOuraScore0to100(-1)).toBeNull();
    expect(normalizeOuraScore0to100(101)).toBeNull();
    expect(normalizeOuraScore0to100("88")).toBeNull();
  });
});

describe("classifyOuraProviderScore / tryClassifyOuraScore (Oura bands)", () => {
  it("classifies every required threshold", () => {
    expect(tryClassifyOuraScore(100)).toBe("Optimal");
    expect(tryClassifyOuraScore(85)).toBe("Optimal");
    expect(tryClassifyOuraScore(84)).toBe("Good");
    expect(tryClassifyOuraScore(70)).toBe("Good");
    expect(tryClassifyOuraScore(69)).toBe("Fair");
    expect(tryClassifyOuraScore(60)).toBe("Fair");
    expect(tryClassifyOuraScore(59)).toBe("Pay attention");
    expect(tryClassifyOuraScore(0)).toBe("Pay attention");
    expect(classifyOuraProviderScore(55)).toBe("Pay attention");
  });

  it("returns null for invalid input instead of inventing a rating", () => {
    expect(tryClassifyOuraScore(null)).toBeNull();
    expect(tryClassifyOuraScore(undefined)).toBeNull();
    expect(tryClassifyOuraScore(Number.NaN)).toBeNull();
    expect(tryClassifyOuraScore(Infinity)).toBeNull();
    expect(tryClassifyOuraScore(101)).toBeNull();
    expect(tryClassifyOuraScore(-1)).toBeNull();
  });
});

describe("scoreToRatingLabel (legacy callers)", () => {
  it("preserves repository bands with Fair at 55", () => {
    expect(scoreToRatingLabel(85)).toBe("Optimal");
    expect(scoreToRatingLabel(70)).toBe("Good");
    expect(scoreToRatingLabel(55)).toBe("Fair");
    expect(scoreToRatingLabel(54)).toBe("Pay attention");
    expect(scoreToRatingLabel(0)).toBe("Pay attention");
  });
});
