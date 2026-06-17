/**
 * View Food (nutrition day) screen: timestamped meals, Log Food CTA preserves day,
 * edit sheet opens and routes edits through the mutations hook (no Firebase in screen).
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1" }, initializing: false, getIdToken: jest.fn().mockResolvedValue("t") }),
}));

jest.mock("@/lib/data/useDailyFacts", () => ({
  useDailyFacts: () => ({
    status: "ready" as const,
    data: { nutrition: { totalKcal: 220, proteinG: 5, carbsG: 43, fatG: 2.5 } },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useRawEvents", () => ({
  useRawEvents: () => ({
    status: "ready" as const,
    data: {
      items: [
        {
          id: "evt-1",
          userId: "u1",
          sourceId: "manual",
          kind: "nutrition",
          observedAt: "2026-03-15T18:22:00.000Z",
          receivedAt: "2026-03-15T18:22:00.000Z",
          schemaVersion: 1,
          payload: {
            start: "2026-03-15T18:22:00.000Z",
            end: "2026-03-15T18:22:01.000Z",
            timezone: "UTC",
            day: "2026-03-15",
            totalKcal: 220,
            proteinG: 5,
            carbsG: 43,
            fatG: 2.5,
            logScope: "meal",
            foodLabel: "Jasmine Rice (Minute)",
            mealSlot: "dinner",
          },
        },
      ],
      nextCursor: null,
    },
    refetch: jest.fn(),
  }),
}));

const mockUpdateLog = jest.fn().mockResolvedValue({ ok: true });
const mockDeleteLog = jest.fn().mockResolvedValue({ ok: true });
const mockReset = jest.fn();

jest.mock("@/lib/hooks/useNutritionLogMutations", () => ({
  useNutritionLogMutations: () => ({
    status: "idle" as const,
    errorMessage: null,
    updateLog: mockUpdateLog,
    deleteLog: mockDeleteLog,
    reset: mockReset,
  }),
}));

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ day: "2026-03-15" }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

import NutritionViewFoodScreen from "../day/[day]";

describe("NutritionViewFoodScreen", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUpdateLog.mockClear();
  });

  it("shows View Food title, date, and timestamped logged meals", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionViewFoodScreen />);
    });
    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain("View Food");
    expect(flat).toContain("Jasmine Rice (Minute)");
    expect(flat).toContain("Meal 3");
    expect(flat).toContain("220 kcal");
    expect(() => tree!.root.findByProps({ testID: "view-food-day" })).not.toThrow();
    expect(() => tree!.root.findByProps({ testID: "view-food-meal-evt-1" })).not.toThrow();
  });

  it("Log Food button preserves the selected day", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionViewFoodScreen />);
    });
    const cta = tree!.root.findByProps({ testID: "view-food-log-cta" });
    await act(async () => {
      cta.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/nutrition/log-hub",
      params: { day: "2026-03-15" },
    });
  });

  it("opens the edit sheet for a meal and routes save through updateLog", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionViewFoodScreen />);
    });
    await act(async () => {
      tree!.root.findByProps({ testID: "view-food-meal-evt-1" }).props.onPress();
    });
    // Time button pre-filled from the meal's observed time.
    const timeButton = tree!.root.findByProps({ testID: "edit-meal-time-button" });
    expect(timeButton.props.accessibilityLabel).toMatch(/Logged time/);

    await act(async () => {
      tree!.root.findByProps({ testID: "edit-meal-save" }).props.onPress();
    });
    expect(mockUpdateLog).toHaveBeenCalledTimes(1);
    expect(mockUpdateLog.mock.calls[0]![0].rawEventId).toBe("evt-1");
    expect(mockUpdateLog.mock.calls[0]![0].mealSlot).toBe("meal3");
  });
});
