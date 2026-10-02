import {
  buildWaistHistoryPointsFromRows,
  buildWaistHistoryStats,
  extractWaistHistoryPoint,
  selectLatestWaistForPresentation,
  sortWaistPointsAscending,
  sortWaistPointsDescending,
  type WaistHistoryPoint,
} from "@/lib/data/body/waistHistoryPoints";

const TZ = "America/New_York";

function point(
  partial: Partial<WaistHistoryPoint> & Pick<WaistHistoryPoint, "rawEventId" | "observedAt" | "waistCm">,
): WaistHistoryPoint {
  return {
    dayKey: partial.dayKey ?? partial.observedAt.slice(0, 10),
    sourceId: partial.sourceId ?? "manual",
    protocolId: partial.protocolId ?? "who_midpoint_v1",
    ...partial,
  };
}

describe("waistHistoryPoints", () => {
  it("extracts finite positive waist and includes manual sourceId", () => {
    const p = extractWaistHistoryPoint(
      {
        id: "e1",
        observedAt: "2026-03-04T12:00:00.000Z",
        sourceId: "manual",
        kind: "body_composition",
        payload: {
          time: "2026-03-04T12:00:00.000Z",
          timezone: TZ,
          waistCircumferenceCm: 82.5,
          protocolId: "who_midpoint_v1",
        },
      },
      TZ,
    );
    expect(p).toEqual(
      expect.objectContaining({
        rawEventId: "e1",
        waistCm: 82.5,
        sourceId: "manual",
        protocolId: "who_midpoint_v1",
      }),
    );
  });

  it("includes non-manual sources that carry waist (no Apple Health-only filter)", () => {
    const p = extractWaistHistoryPoint(
      {
        id: "e2",
        observedAt: "2026-03-04T12:00:00.000Z",
        sourceId: "withings",
        kind: "body_composition",
        payload: { waistCircumferenceCm: 80 },
      },
      TZ,
    );
    expect(p?.sourceId).toBe("withings");
    expect(p?.waistCm).toBe(80);
  });

  it("rejects non-positive / missing waist and non-composition kinds", () => {
    expect(
      extractWaistHistoryPoint(
        {
          id: "x",
          observedAt: "2026-03-04T12:00:00.000Z",
          sourceId: "manual",
          kind: "body_composition",
          payload: { waistCircumferenceCm: 0 },
        },
        TZ,
      ),
    ).toBeNull();
    expect(
      extractWaistHistoryPoint(
        {
          id: "x",
          observedAt: "2026-03-04T12:00:00.000Z",
          sourceId: "manual",
          kind: "weight",
          payload: { waistCircumferenceCm: 80 },
        },
        TZ,
      ),
    ).toBeNull();
  });

  it("preserves same-day distinct timestamps in ascending order", () => {
    const points = buildWaistHistoryPointsFromRows(
      [
        {
          id: "pm",
          observedAt: "2026-03-04T18:00:00.000Z",
          sourceId: "manual",
          kind: "body_composition",
          payload: { waistCircumferenceCm: 81.5 },
        },
        {
          id: "am",
          observedAt: "2026-03-04T08:00:00.000Z",
          sourceId: "manual",
          kind: "body_composition",
          payload: { waistCircumferenceCm: 80 },
        },
      ],
      TZ,
    );
    expect(points).toHaveLength(2);
    expect(points.map((p) => p.rawEventId)).toEqual(["am", "pm"]);
    expect(sortWaistPointsDescending(points).map((p) => p.rawEventId)).toEqual(["pm", "am"]);
  });

  it("selectLatestWaistForPresentation uses max observedAt only", () => {
    const points = [
      point({
        rawEventId: "older",
        observedAt: "2026-01-01T00:00:00.000Z",
        waistCm: 90,
      }),
      point({
        rawEventId: "newer",
        observedAt: "2026-02-01T00:00:00.000Z",
        waistCm: 85,
      }),
      point({
        rawEventId: "mid",
        observedAt: "2026-01-15T00:00:00.000Z",
        waistCm: 88,
      }),
    ];
    const latest = selectLatestWaistForPresentation(points);
    expect(latest?.rawEventId).toBe("newer");
    expect(latest?.waistCm).toBe(85);
  });

  it("does not invent points from profile waist (no profile path in extractor)", () => {
    const points = buildWaistHistoryPointsFromRows([], TZ);
    expect(points).toEqual([]);
    expect(selectLatestWaistForPresentation(points)).toBeNull();
  });

  it("builds low/high/change from ascending series", () => {
    const sorted = sortWaistPointsAscending([
      point({ rawEventId: "b", observedAt: "2026-02-01T00:00:00.000Z", waistCm: 84 }),
      point({ rawEventId: "a", observedAt: "2026-01-01T00:00:00.000Z", waistCm: 80 }),
    ]);
    expect(buildWaistHistoryStats(sorted)).toEqual({
      low: 80,
      high: 84,
      change: 4,
    });
    expect(buildWaistHistoryStats([])).toEqual({ low: null, high: null, change: null });
  });
});
