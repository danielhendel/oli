import { sleepTotals } from "../facts/recovery";

describe("sleepTotals", () => {
  it("computes minutes from stages if total missing", () => {
    const out = sleepTotals({
      sleep: {
        stages: [
          { start: "2024-01-01T00:00:00Z", end: "2024-01-01T00:20:00Z", stage: "light" },
          { start: "2024-01-01T00:20:00Z", end: "2024-01-01T01:00:00Z", stage: "deep" },
        ],
      },
    });
    expect(out.totalMin).toBe(60 - 0); // 60 min
  });
});
