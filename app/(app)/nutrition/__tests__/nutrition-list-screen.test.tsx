import React from "react";
import renderer, { act } from "react-test-renderer";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useNavigation: () => ({
    setOptions: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1" }, initializing: false }),
}));

jest.mock("@/lib/data/useRawEvents", () => ({
  useRawEvents: () => ({
    status: "ready",
    data: {
      items: [
        {
          id: "m1",
          userId: "u1",
          sourceId: "manual",
          kind: "nutrition",
          observedAt: "2026-06-17T12:00:00.000Z",
          receivedAt: "2026-06-17T12:00:01.000Z",
          schemaVersion: 1,
          payload: {
            start: "2026-06-17T12:00:00.000Z",
            end: "2026-06-17T12:00:01.000Z",
            timezone: "America/New_York",
            day: "2026-06-17",
            totalKcal: 800,
            proteinG: 60,
            carbsG: 90,
            fatG: 20,
            logScope: "meal",
            foodLabel: "Lunch",
            mealSlot: "lunch",
          },
        },
        {
          id: "m2",
          userId: "u1",
          sourceId: "manual",
          kind: "nutrition",
          observedAt: "2026-06-17T19:00:00.000Z",
          receivedAt: "2026-06-17T19:00:01.000Z",
          schemaVersion: 1,
          payload: {
            start: "2026-06-17T19:00:00.000Z",
            end: "2026-06-17T19:00:01.000Z",
            timezone: "America/New_York",
            day: "2026-06-17",
            totalKcal: 1271,
            proteinG: 119,
            carbsG: 136,
            fatG: 27,
            logScope: "meal",
            foodLabel: "Dinner",
            mealSlot: "dinner",
          },
        },
      ],
    },
    refetch: jest.fn(),
  }),
}));

import NutritionLogScreen from "../list";

describe("NutritionLogScreen (daily recap)", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("shows one recap row per day with calories and macros", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionLogScreen />);
      await Promise.resolve();
    });
    expect(tree.root.findByProps({ testID: "nutrition-log-row-2026-06-17" })).toBeDefined();
    expect(tree.root.findByProps({ children: "Calories 2,071 kcal" })).toBeDefined();
    expect(tree.root.findByProps({ children: "Protein 179 g · Carbs 226 g · Fat 47 g" })).toBeDefined();
  });

  it("routes row press to View Food day page", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionLogScreen />);
      await Promise.resolve();
    });
    const row = tree.root.findByProps({ testID: "nutrition-log-row-2026-06-17" });
    await act(async () => {
      row.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/nutrition/day/[day]",
      params: { day: "2026-06-17" },
    });
  });
});
