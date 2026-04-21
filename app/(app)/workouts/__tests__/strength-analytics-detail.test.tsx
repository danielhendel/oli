/**
 * Strength Analytics screen shows the yearly strength workouts chart (`WORKOUT_OVERVIEW_ANALYTICS_YEAR`).
 */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { WORKOUT_OVERVIEW_ANALYTICS_YEAR } from "@/lib/data/workouts/workoutsCalendarModel";
import { buildStrengthAnalyticsCardModels } from "@/lib/data/workouts/strengthAnalyticsCardModels";

const mockSetParams = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ setParams: mockSetParams }),
}));

const mockModels = buildStrengthAnalyticsCardModels({
  domain: "strength",
  analyticsDaysSlice: [],
  todayDayKey: "2026-03-12",
  manualWorkoutSummaries: [],
  customExerciseById: new Map(),
  weekStartDay: "2026-03-09",
  weekEndDay: "2026-03-15",
  weeklySessionDisplayHints: [],
});

jest.mock("@/lib/hooks/useStrengthAnalyticsDetailScreenData", () => ({
  useStrengthAnalyticsDetailScreenData: jest.fn(() => ({
    models: mockModels,
    calendarReady: true,
  })),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn(),
  }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

import StrengthAnalyticsDetailScreen from "../analytics-detail";

describe("StrengthAnalyticsDetailScreen", () => {
  /** Single root per test; unmount so focus-emphasis timers and effects do not leak workers. */
  let mounted: renderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    mockSetParams.mockClear();
    mockSearchParams = {};
  });

  afterEach(() => {
    const t = mounted;
    mounted = null;
    if (t != null) {
      act(() => {
        t.unmount();
      });
    }
  });

  it("renders only the yearly strength workouts section with calendar-year title", async () => {
    await act(async () => {
      mounted = renderer.create(<StrengthAnalyticsDetailScreen />);
    });
    const json = JSON.stringify(mounted!.toJSON());
    expect(json).toContain(`${WORKOUT_OVERVIEW_ANALYTICS_YEAR} Strength Workouts`);
    expect(json).not.toContain("Weekly Strength");
    expect(json).not.toContain("Weekly Muscle Group");
    expect(json).not.toContain("Monthly Workouts");
    expect(json).not.toContain("Yearly Workouts");
    expect(json).not.toContain("Total Workouts");
    expect(json).not.toContain("Avg per Month");
    expect(json).not.toContain("Avg per Week");
    expect(json).not.toContain("Avg Duration");
    expect(json).toContain("strength-analytics-yearly");
    expect(json).toContain("strength-yearly-chart-baseline-line");
  });

  it("does not resurrect removed weekly/monthly analytics UI if strings regress", async () => {
    await act(async () => {
      mounted = renderer.create(<StrengthAnalyticsDetailScreen />);
    });
    const json = JSON.stringify(mounted!.toJSON());
    expect(json).not.toContain("strength-analytics-weekly-strength");
    expect(json).not.toContain("strength-analytics-weekly-muscle");
    expect(json).not.toContain("strength-analytics-monthly");
  });

  it("clears focus route params after models are ready and focus is present", async () => {
    mockSearchParams = { focusSection: "weekly_muscle_group", focusEmphasis: "balance" };
    await act(async () => {
      mounted = renderer.create(<StrengthAnalyticsDetailScreen />);
    });
    expect(mockSetParams).toHaveBeenCalledWith(
      expect.objectContaining({
        focusSection: undefined,
        focusEmphasis: undefined,
        focusMuscle: undefined,
      }),
    );
  });

  it("does not call setParams when no focus params are present", async () => {
    mockSearchParams = {};
    await act(async () => {
      mounted = renderer.create(<StrengthAnalyticsDetailScreen />);
    });
    expect(mockSetParams).not.toHaveBeenCalled();
  });
});
