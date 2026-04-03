import { selectBodyFactsForDayFromRaw } from "../bodyFactsSelectionPure";

describe("selectBodyFactsForDayFromRaw", () => {
  it("prefers apple_health when metricSources.weight is apple_health", () => {
    const body = selectBodyFactsForDayFromRaw(
      [
        {
          observedAt: "2026-04-01T10:00:00.000Z",
          sourceId: "manual",
          weightKg: 70,
        },
        {
          observedAt: "2026-04-01T11:00:00.000Z",
          sourceId: "apple_health",
          weightKg: 72,
        },
      ],
      { weight: "apple_health" },
    );
    expect(body?.weightKg).toBe(72);
  });

  it("returns undefined when no metrics", () => {
    expect(selectBodyFactsForDayFromRaw([], {})).toBeUndefined();
  });

  it("returns undefined when only withings (or other non-Apple) events exist", () => {
    expect(
      selectBodyFactsForDayFromRaw(
        [
          {
            observedAt: "2026-04-01T11:00:00.000Z",
            sourceId: "withings",
            weightKg: 72,
          },
        ],
        { weight: "apple_health" },
      ),
    ).toBeUndefined();
  });

  it("uses only apple_health when withings samples also exist", () => {
    const body = selectBodyFactsForDayFromRaw(
      [
        {
          observedAt: "2026-04-01T09:00:00.000Z",
          sourceId: "withings",
          weightKg: 999,
        },
        {
          observedAt: "2026-04-01T10:00:00.000Z",
          sourceId: "apple_health",
          weightKg: 72,
        },
      ],
      { weight: "apple_health" },
    );
    expect(body?.weightKg).toBe(72);
  });

  it("treats healthkit sourceId as eligible for synthesis", () => {
    const body = selectBodyFactsForDayFromRaw(
      [
        {
          observedAt: "2026-04-01T10:00:00.000Z",
          sourceId: "healthkit",
          weightKg: 71.5,
        },
      ],
      { weight: "apple_health" },
    );
    expect(body?.weightKg).toBe(71.5);
  });
});
