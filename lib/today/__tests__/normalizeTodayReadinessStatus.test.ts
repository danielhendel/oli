import {
  normalizeTodayReadinessStatus,
  readinessActivityPhraseFromScore,
} from "@/lib/today/normalizeTodayReadinessStatus";

describe("normalizeTodayReadinessStatus", () => {
  it("returns missing when no readiness or sleep score", () => {
    expect(normalizeTodayReadinessStatus({ readinessScore: null, sleepScore: null })).toBe("missing");
  });

  it("returns partial when sleep exists but readiness score is missing", () => {
    expect(normalizeTodayReadinessStatus({ readinessScore: null, sleepScore: 84 })).toBe("partial");
  });

  it("returns ready when readiness score exists", () => {
    expect(normalizeTodayReadinessStatus({ readinessScore: 78, sleepScore: 84 })).toBe("ready");
    expect(normalizeTodayReadinessStatus({ readinessScore: 78, sleepScore: null })).toBe("ready");
  });

  it("returns error when fetch status is error", () => {
    expect(
      normalizeTodayReadinessStatus({
        readinessScore: 90,
        sleepScore: 84,
        fetchStatus: "error",
      }),
    ).toBe("error");
  });

  it("never returns unknown", () => {
    const cases = [
      { readinessScore: null, sleepScore: null },
      { readinessScore: null, sleepScore: 80 },
      { readinessScore: 65, sleepScore: null },
      { readinessScore: 91, sleepScore: 88, fetchStatus: "error" as const },
    ];
    for (const input of cases) {
      expect(normalizeTodayReadinessStatus(input)).not.toBe("unknown");
    }
  });
});

describe("readinessActivityPhraseFromScore", () => {
  it("maps score tiers to user-facing guidance", () => {
    expect(readinessActivityPhraseFromScore(85)).toContain("active day");
    expect(readinessActivityPhraseFromScore(70)).toContain("moderate day");
    expect(readinessActivityPhraseFromScore(55)).toContain("easier");
  });
});
