import { normalizeRecovery } from "../normalize";

describe("normalizeRecovery", () => {
  it("parses stages and totals", () => {
    const out = normalizeRecovery({
      sleep: {
        stages: [
          { start: "2024-01-01T00:00:00Z", end: "2024-01-01T00:30:00Z", stage: "light" },
          { start: "2024-01-01T00:30:00Z", end: "2024-01-01T01:00:00Z", stage: "deep" },
        ],
      },
      physio: { rhrBpm: 50, hrvMs: 80 },
      subjective: { energy1to5: 5, stress1to5: 1 },
    });
    expect(out.sleep?.stages?.length).toBe(2);
    expect(out.physio?.rhrBpm).toBe(50);
  });
});
