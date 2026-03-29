/**
 * Strength Analytics screen shows the full analytics card stack.
 */
import React from "react";
import renderer, { act } from "react-test-renderer";
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

  it("renders weekly, muscle, monthly, and yearly sections", async () => {
    await act(async () => {
      mounted = renderer.create(<StrengthAnalyticsDetailScreen />);
    });
    const json = JSON.stringify(mounted!.toJSON());
    expect(json).toContain("Weekly Strength");
    expect(json).toContain("Weekly Muscle Group");
    expect(json).toContain("Monthly Workouts");
    expect(json).toContain("Yearly Workouts");
  });

  it("exposes section test ids for Weekly Strength and Weekly Muscle Group", async () => {
    await act(async () => {
      mounted = renderer.create(<StrengthAnalyticsDetailScreen />);
    });
    const json = JSON.stringify(mounted!.toJSON());
    expect(json).toContain("strength-analytics-weekly-strength");
    expect(json).toContain("strength-analytics-weekly-muscle");
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
