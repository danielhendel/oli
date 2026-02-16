import { normalizeCardio } from "../normalize";

describe("normalizeCardio", () => {
  it("normalizes summary and laps", () => {
    const out = normalizeCardio({
      modality: "run",
      summary: { distanceKm: 5, durationMs: 1_500_000, rpe: 7 },
      laps: [{ idx: 1, distanceKm: 1, durationMs: 300_000, avgHr: 150 }],
    });

    expect(out.modality).toBe("run");
    expect(out.summary?.distanceKm).toBe(5);
    expect(out.summary?.durationMs).toBe(1_500_000);

    expect(out.laps?.length).toBe(1);
    const lap0 = out.laps![0]!;
    expect(lap0.avgHr).toBe(150);
  });
});
