import { cardioTotals } from "../facts/cardio";

describe("cardioTotals", () => {
  it("sums summary and laps", () => {
    const out = cardioTotals({
      modality: "run",
      summary: { distanceKm: 3, durationMs: 900000 },
      laps: [{ idx: 1, distanceKm: 2, durationMs: 600000 }],
    });
    expect(out.distanceKmTotal).toBe(5);
    expect(out.durationMinTotal).toBe(25);
  });
});
