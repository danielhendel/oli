import { describe, expect, it } from "@jest/globals";

import {
  buildBatchHistoricalRepairJsonObject,
  buildBatchHistoricalRepairJsonString,
  buildHistoricalRepairJsonObject,
  buildHistoricalRepairJsonString,
  filterHistoricalAppleWorkoutsForRepair,
  isValidYmd,
  parseHistoricalRepairDaysInput,
  type HistoricalRepairProbeItem,
} from "@/lib/debug/historicalStepRepairProbe";
import { workoutIdempotencyKey } from "@/lib/integrations/appleHealth/idempotency";
import type { TodayWorkout } from "@/lib/integrations/appleHealth/types";

function workout(partial: Partial<TodayWorkout>): TodayWorkout {
  return {
    id: partial.id ?? "wk-1",
    start: partial.start ?? "2026-05-19T13:00:00.000Z",
    end: partial.end ?? "2026-05-19T13:30:00.000Z",
    activityId: partial.activityId ?? 37,
    activityName: partial.activityName ?? "Running",
    sourceId: partial.sourceId ?? "com.apple.health.X",
    durationMinutes: partial.durationMinutes ?? 30,
    calories: partial.calories ?? 250,
  };
}

describe("isValidYmd", () => {
  it("accepts valid YYYY-MM-DD strings", () => {
    expect(isValidYmd("2026-05-19")).toBe(true);
    expect(isValidYmd("2026-01-01")).toBe(true);
    expect(isValidYmd("2026-12-31")).toBe(true);
    expect(isValidYmd("2024-02-29")).toBe(true);
  });

  it("rejects malformed shapes", () => {
    expect(isValidYmd("")).toBe(false);
    expect(isValidYmd("2026/05/19")).toBe(false);
    expect(isValidYmd("2026-5-19")).toBe(false);
    expect(isValidYmd("26-05-19")).toBe(false);
    expect(isValidYmd("2026-05-19T00:00:00")).toBe(false);
    expect(isValidYmd("abcd-ef-gh")).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(isValidYmd("2026-02-30")).toBe(false);
    expect(isValidYmd("2026-04-31")).toBe(false);
    expect(isValidYmd("2026-13-01")).toBe(false);
    expect(isValidYmd("2026-00-15")).toBe(false);
    expect(isValidYmd("2025-02-29")).toBe(false);
  });

  it("rejects non-string inputs", () => {
    expect(isValidYmd(null)).toBe(false);
    expect(isValidYmd(undefined)).toBe(false);
    // @ts-expect-error - intentional bad input
    expect(isValidYmd(20260519)).toBe(false);
  });
});

describe("filterHistoricalAppleWorkoutsForRepair", () => {
  it("keeps cardio + strength workouts and drops excluded sports", () => {
    const workouts: TodayWorkout[] = [
      workout({ id: "a", activityName: "Running" }),
      workout({ id: "b", activityName: "TraditionalStrengthTraining" }),
      workout({ id: "c", activityName: "Walking" }),
      workout({ id: "d", activityName: "Other" }),
      workout({ id: "e", activityName: "Yoga" }),
      workout({ id: "f", activityName: "" }),
    ];
    const filtered = filterHistoricalAppleWorkoutsForRepair(workouts);
    expect(filtered.map((w) => w.id)).toEqual(["a", "b", "c"]);
  });

  it("preserves input order", () => {
    const workouts: TodayWorkout[] = [
      workout({ id: "1", activityName: "Other" }),
      workout({ id: "2", activityName: "TraditionalStrengthTraining" }),
      workout({ id: "3", activityName: "Walking" }),
      workout({ id: "4", activityName: "Running" }),
    ];
    const filtered = filterHistoricalAppleWorkoutsForRepair(workouts);
    expect(filtered.map((w) => w.id)).toEqual(["2", "3", "4"]);
  });

  it("returns an empty array when nothing matches", () => {
    const workouts: TodayWorkout[] = [
      workout({ id: "a", activityName: "Other" }),
      workout({ id: "b", activityName: "Yoga" }),
    ];
    expect(filterHistoricalAppleWorkoutsForRepair(workouts)).toEqual([]);
  });

  it("is robust to malformed activityName values", () => {
    const workouts = [
      // @ts-expect-error - intentional bad input
      { ...workout({}), activityName: null },
      // @ts-expect-error - intentional bad input
      { ...workout({ id: "x" }), activityName: undefined },
      workout({ id: "ok", activityName: "Running" }),
    ] as TodayWorkout[];
    const filtered = filterHistoricalAppleWorkoutsForRepair(workouts);
    expect(filtered.map((w) => w.id)).toEqual(["ok"]);
  });
});

describe("buildHistoricalRepairJsonObject", () => {
  const items: HistoricalRepairProbeItem[] = [
    {
      start: "2026-05-19T12:57:46.490-0400",
      end: "2026-05-19T13:54:24.481-0400",
      activityId: 50,
      sourceId: "com.apple.health.52A581D0-95A2-43FC-A018-3118F3D4AA29",
      measuredSteps: 1843,
    },
    {
      start: "2026-05-19T18:57:22.171-0400",
      end: "2026-05-19T19:32:33.512-0400",
      activityId: 37,
      sourceId: null,
      measuredSteps: null,
    },
  ];

  it("produces the exact wire shape expected by the admin script", () => {
    const out = buildHistoricalRepairJsonObject({
      uid: "uid-1",
      day: "2026-05-19",
      items,
    });
    expect(out).toEqual({
      uid: "uid-1",
      day: "2026-05-19",
      measurements: [
        {
          rawEventId: workoutIdempotencyKey({
            startIso: items[0]!.start,
            endIso: items[0]!.end,
            activityId: items[0]!.activityId,
            sourceId: items[0]!.sourceId,
          }),
          steps: 1843,
        },
        {
          rawEventId: workoutIdempotencyKey({
            startIso: items[1]!.start,
            endIso: items[1]!.end,
            activityId: items[1]!.activityId,
            sourceId: null,
          }),
          steps: null,
        },
      ],
    });
  });

  it("rounds finite fractional step counts and preserves null fail-closed values", () => {
    const out = buildHistoricalRepairJsonObject({
      uid: "u",
      day: "2026-05-19",
      items: [
        { ...items[0]!, measuredSteps: 1842.6 },
        { ...items[1]!, measuredSteps: null },
        { ...items[0]!, activityId: 99, measuredSteps: 0 },
      ],
    });
    expect(out.measurements.map((m) => m.steps)).toEqual([1843, null, 0]);
  });

  it("collapses negative or non-finite measured values to null (fail-closed)", () => {
    const out = buildHistoricalRepairJsonObject({
      uid: "u",
      day: "2026-05-19",
      items: [
        { ...items[0]!, measuredSteps: -5 },
        { ...items[0]!, activityId: 50, measuredSteps: Number.NaN },
        { ...items[0]!, activityId: 51, measuredSteps: Number.POSITIVE_INFINITY },
      ],
    });
    expect(out.measurements.map((m) => m.steps)).toEqual([null, null, null]);
  });

  it("preserves input order in the output", () => {
    const out = buildHistoricalRepairJsonObject({
      uid: "u",
      day: "2026-05-19",
      items: [
        { ...items[0]!, activityId: 1, measuredSteps: 100 },
        { ...items[0]!, activityId: 2, measuredSteps: 200 },
        { ...items[0]!, activityId: 3, measuredSteps: 300 },
      ],
    });
    expect(out.measurements.map((m) => m.steps)).toEqual([100, 200, 300]);
  });

  it("is deterministic when called twice with the same input", () => {
    const a = buildHistoricalRepairJsonObject({ uid: "u", day: "2026-05-19", items });
    const b = buildHistoricalRepairJsonObject({ uid: "u", day: "2026-05-19", items });
    expect(a).toEqual(b);
  });
});

describe("parseHistoricalRepairDaysInput", () => {
  it("parses a newline-separated list", () => {
    const out = parseHistoricalRepairDaysInput("2026-05-19\n2026-05-20\n2026-05-21");
    expect(out).toEqual(["2026-05-19", "2026-05-20", "2026-05-21"]);
  });

  it("parses a comma-separated list", () => {
    expect(parseHistoricalRepairDaysInput("2026-05-19, 2026-05-20,2026-05-21")).toEqual([
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
    ]);
  });

  it("parses a whitespace-separated list (spaces + tabs)", () => {
    expect(parseHistoricalRepairDaysInput("2026-05-19  2026-05-20\t2026-05-21")).toEqual([
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
    ]);
  });

  it("handles mixed separators and surrounding whitespace", () => {
    const blob = "\n  2026-05-19 ,  2026-05-20\n\n,2026-05-21,\n";
    expect(parseHistoricalRepairDaysInput(blob)).toEqual([
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
    ]);
  });

  it("dedupes while preserving first-seen order", () => {
    const out = parseHistoricalRepairDaysInput(
      "2026-05-21\n2026-05-19\n2026-05-21\n2026-05-19",
    );
    expect(out).toEqual(["2026-05-21", "2026-05-19"]);
  });

  it("returns an empty array for empty / whitespace-only input", () => {
    expect(parseHistoricalRepairDaysInput("")).toEqual([]);
    expect(parseHistoricalRepairDaysInput("   \n  \t  ,  ")).toEqual([]);
  });

  it("throws on the first invalid day token (fail-closed)", () => {
    expect(() => parseHistoricalRepairDaysInput("2026-05-19\n2026-13-01")).toThrow(
      /Invalid day "2026-13-01"/,
    );
    expect(() => parseHistoricalRepairDaysInput("2026-05-19,not-a-date")).toThrow(
      /Invalid day "not-a-date"/,
    );
    expect(() => parseHistoricalRepairDaysInput("2026-02-30")).toThrow(
      /Invalid day "2026-02-30"/,
    );
  });

  it("throws when given a non-string", () => {
    // @ts-expect-error - intentional bad input
    expect(() => parseHistoricalRepairDaysInput(123)).toThrow();
  });
});

describe("buildBatchHistoricalRepairJsonObject", () => {
  const itemA: HistoricalRepairProbeItem = {
    start: "2026-05-19T12:57:46.490-0400",
    end: "2026-05-19T13:54:24.481-0400",
    activityId: 50,
    sourceId: "com.apple.health.X",
    measuredSteps: 1843,
  };
  const itemB: HistoricalRepairProbeItem = {
    start: "2026-05-19T18:57:22.171-0400",
    end: "2026-05-19T19:32:33.512-0400",
    activityId: 37,
    sourceId: null,
    measuredSteps: null,
  };
  const itemC: HistoricalRepairProbeItem = {
    start: "2026-05-20T08:56:20.370-0400",
    end: "2026-05-20T10:00:43.222-0400",
    activityId: 50,
    sourceId: "com.apple.health.X",
    measuredSteps: 1198,
  };

  it("produces the documented batch wire shape", () => {
    const out = buildBatchHistoricalRepairJsonObject({
      uid: "uid-1",
      generatedAt: "2026-05-24T15:00:00.000Z",
      days: [
        { day: "2026-05-19", items: [itemA, itemB] },
        { day: "2026-05-20", items: [itemC] },
      ],
    });
    expect(out.uid).toBe("uid-1");
    expect(out.generatedAt).toBe("2026-05-24T15:00:00.000Z");
    expect(out.days.map((d) => d.day)).toEqual(["2026-05-19", "2026-05-20"]);
    expect(out.days[0]!.measurements).toHaveLength(2);
    expect(out.days[1]!.measurements).toHaveLength(1);
    expect(out.days[0]!.measurements[0]!.steps).toBe(1843);
    expect(out.days[0]!.measurements[1]!.steps).toBe(null);
    expect(out.days[1]!.measurements[0]!.steps).toBe(1198);
    expect(out.days[0]!.measurements[0]!.rawEventId).toContain(
      "appleHealth:v2:workout:",
    );
  });

  it("preserves input day + workout order (deterministic output)", () => {
    const out = buildBatchHistoricalRepairJsonObject({
      uid: "u",
      generatedAt: "t",
      days: [
        { day: "2026-05-23", items: [itemC] },
        { day: "2026-05-19", items: [itemA, itemB] },
      ],
    });
    expect(out.days.map((d) => d.day)).toEqual(["2026-05-23", "2026-05-19"]);
    expect(out.days[1]!.measurements.map((m) => m.steps)).toEqual([1843, null]);
  });

  it("excludes days with zero measurements", () => {
    const out = buildBatchHistoricalRepairJsonObject({
      uid: "u",
      generatedAt: "t",
      days: [
        { day: "2026-05-19", items: [itemA] },
        { day: "2026-05-20", items: [] },
        { day: "2026-05-21", items: [itemC] },
      ],
    });
    expect(out.days.map((d) => d.day)).toEqual(["2026-05-19", "2026-05-21"]);
  });

  it("returns an empty days array when every day has zero measurements", () => {
    const out = buildBatchHistoricalRepairJsonObject({
      uid: "u",
      generatedAt: "t",
      days: [
        { day: "2026-05-19", items: [] },
        { day: "2026-05-20", items: [] },
      ],
    });
    expect(out.days).toEqual([]);
    expect(out.uid).toBe("u");
    expect(out.generatedAt).toBe("t");
  });

  it("preserves null steps and rounds fractional steps within batch days", () => {
    const out = buildBatchHistoricalRepairJsonObject({
      uid: "u",
      generatedAt: "t",
      days: [
        {
          day: "2026-05-19",
          items: [
            { ...itemA, measuredSteps: 1842.4 },
            { ...itemA, activityId: 51, measuredSteps: null },
            { ...itemA, activityId: 52, measuredSteps: -7 },
          ],
        },
      ],
    });
    expect(out.days[0]!.measurements.map((m) => m.steps)).toEqual([1842, null, null]);
  });

  it("is deterministic across repeated calls with the same input", () => {
    const input = {
      uid: "u",
      generatedAt: "t",
      days: [{ day: "2026-05-19", items: [itemA, itemB] }],
    };
    expect(buildBatchHistoricalRepairJsonObject(input)).toEqual(
      buildBatchHistoricalRepairJsonObject(input),
    );
  });
});

describe("buildBatchHistoricalRepairJsonString", () => {
  it("returns pretty-printed JSON that round-trips to the object form", () => {
    const input = {
      uid: "uid-1",
      generatedAt: "2026-05-24T15:00:00.000Z",
      days: [
        {
          day: "2026-05-19",
          items: [
            {
              start: "2026-05-19T12:57:46.490-0400",
              end: "2026-05-19T13:54:24.481-0400",
              activityId: 50,
              sourceId: "com.apple.health.X",
              measuredSteps: 1843,
            },
          ],
        },
      ],
    };
    const str = buildBatchHistoricalRepairJsonString(input);
    expect(str).toContain("\n");
    expect(str).toContain('"uid": "uid-1"');
    expect(str).toContain('"generatedAt": "2026-05-24T15:00:00.000Z"');
    expect(JSON.parse(str)).toEqual(buildBatchHistoricalRepairJsonObject(input));
  });
});

describe("buildHistoricalRepairJsonString", () => {
  it("returns a pretty-printed JSON string matching the object form", () => {
    const items: HistoricalRepairProbeItem[] = [
      {
        start: "2026-05-19T12:57:46.490-0400",
        end: "2026-05-19T13:54:24.481-0400",
        activityId: 50,
        sourceId: "com.apple.health.X",
        measuredSteps: 1234,
      },
    ];
    const str = buildHistoricalRepairJsonString({
      uid: "uid-1",
      day: "2026-05-19",
      items,
    });
    expect(str).toContain("\n");
    expect(str).toContain('"uid": "uid-1"');
    expect(str).toContain('"day": "2026-05-19"');
    expect(str).toContain('"steps": 1234');
    expect(JSON.parse(str)).toEqual(
      buildHistoricalRepairJsonObject({ uid: "uid-1", day: "2026-05-19", items }),
    );
  });
});
