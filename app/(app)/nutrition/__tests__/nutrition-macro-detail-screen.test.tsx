/**
 * Macro detail screen: shows target/percent/progress + contributing foods for the selected day.
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@react-navigation/native", () => ({ useFocusEffect: jest.fn() }));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1" }, initializing: false, getIdToken: jest.fn().mockResolvedValue("t") }),
}));

jest.mock("@/lib/data/useDailyFacts", () => ({
  useDailyFacts: () => ({
    status: "ready" as const,
    data: { nutrition: { proteinG: 75 } },
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
          observedAt: "2026-03-15T13:00:00.000Z",
          receivedAt: "2026-03-15T13:00:00.000Z",
          schemaVersion: 1,
          payload: {
            start: "2026-03-15T13:00:00.000Z",
            end: "2026-03-15T13:00:01.000Z",
            timezone: "UTC",
            totalKcal: 200,
            proteinG: 40,
            carbsG: 0,
            fatG: 4,
            foodLabel: "Chicken breast",
            mealSlot: "lunch",
          },
        },
      ],
      nextCursor: null,
    },
    refetch: jest.fn(),
  }),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ macro: "protein", day: "2026-03-15" }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

import NutritionMacroDetailScreen from "../macro/[macro]";

describe("NutritionMacroDetailScreen", () => {
  it("renders target, percent, progress, and contributing foods", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionMacroDetailScreen />);
    });
    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain("Protein");
    expect(flat).toContain("40 / 150 g");
    expect(flat).toContain("27%");
    expect(flat).toContain("Chicken breast");
    expect(flat).toContain("40 g");
    expect(() => tree!.root.findByProps({ testID: "macro-detail-progress" })).not.toThrow();
    expect(() => tree!.root.findByProps({ testID: "macro-detail-amount" })).not.toThrow();
  });
});
