import { describe, expect, it, jest } from "@jest/globals";

import { preferencesSchema } from "@oli/contracts";
import { parsePreferencesFromApi } from "@/lib/preferences/parsePreferencesFromApi";

const mockGet = jest.fn();
const mockPut = jest.fn();

jest.mock("@/lib/api/http", () => ({
  apiGetJsonAuthed: (...args: unknown[]) => mockGet(...args),
  apiPutJsonAuthed: (...args: unknown[]) => mockPut(...args),
}));

import {
  getPreferences,
  updateWeeklyFitnessGoals,
} from "@/lib/api/preferences";

describe("preferences API client", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPut.mockReset();
  });

  it("parses legacy PUT response missing sleepHoursPerNightGoal (no contract failure)", async () => {
    mockPut.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r1",
      json: {
        units: { mass: "lb" },
        timezone: { mode: "recorded" },
        selectedGymId: null,
        metricSources: { weight: "apple_health" },
        weeklyFitnessGoals: {
          activityStepsPerDayGoal: 10_000,
          strengthWorkoutsPerWeekGoal: 5,
          cardioMilesPerWeekGoal: 10,
          updatedAt: "2026-05-01T00:00:00Z",
        },
      },
    });

    const res = await updateWeeklyFitnessGoals("token", {
      activityStepsPerDayGoal: 10_000,
      strengthWorkoutsPerWeekGoal: 5,
      cardioMilesPerWeekGoal: 10,
      sleepHoursPerNightGoal: 7.5,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.json.weeklyFitnessGoals?.sleepHoursPerNightGoal).toBe(8);
    expect(preferencesSchema.safeParse(res.json).success).toBe(true);
  });

  it("parsePreferencesFromApi accepts sleep goal 7.5 in response", () => {
    const parsed = parsePreferencesFromApi({
      units: { mass: "lb" },
      timezone: { mode: "recorded" },
      selectedGymId: null,
      weeklyFitnessGoals: {
        activityStepsPerDayGoal: 12_000,
        strengthWorkoutsPerWeekGoal: 4,
        cardioMilesPerWeekGoal: 8,
        sleepHoursPerNightGoal: 7.5,
        updatedAt: new Date().toISOString(),
      },
    });
    expect(parsed.weeklyFitnessGoals?.sleepHoursPerNightGoal).toBe(7.5);
  });

  it("GET uses parsePreferencesFromApi on 200", async () => {
    mockGet.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r2",
      json: {
        units: { mass: "lb" },
        timezone: { mode: "recorded" },
        selectedGymId: null,
      },
    });
    const res = await getPreferences("token");
    expect(res.ok).toBe(true);
  });
});
