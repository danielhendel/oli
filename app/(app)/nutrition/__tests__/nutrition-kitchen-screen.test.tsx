import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/lib/hooks/useNutritionPantry", () => ({
  useNutritionPantry: () => ({
    items: [
      {
        id: "p1",
        label: "Chicken breast",
        oliFoodId: "oli:fg:chicken",
        servingLabel: "120 g",
        defaultServings: 1,
        macrosPerServing: { caloriesKcal: 198, proteinG: 37.2, carbsG: 0, fatG: 4.32 },
        addedAt: "2026-03-15T00:00:00.000Z",
        schemaVersion: 1,
      },
    ],
    loading: false,
    errorMessage: null,
    refresh: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
  }),
}));

const mockQuickLog = jest.fn().mockResolvedValue({ ok: true, queued: false });
jest.mock("@/lib/hooks/useNutritionQuickLog", () => ({
  useNutritionQuickLog: () => ({ pendingId: null, errorMessage: null, quickLog: mockQuickLog }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ day: "2026-03-15" }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

import NutritionKitchenScreen from "../kitchen";

describe("NutritionKitchenScreen — quick log", () => {
  beforeEach(() => {
    mockQuickLog.mockClear();
    mockPush.mockClear();
  });

  it("quick-logs a pantry item to the selected day", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionKitchenScreen />);
    });
    const logBtn = tree!.root.findByProps({ testID: "kitchen-log-p1" });
    await act(async () => {
      logBtn.props.onPress();
    });
    expect(mockQuickLog).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "food",
        food: expect.objectContaining({ id: "oli:fg:chicken", name: "Chicken breast" }),
      }),
      "2026-03-15",
    );
  });

  it("passes day when navigating to search to add a product", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionKitchenScreen />);
    });
    const addBtn = tree!.root.findByProps({ testID: "kitchen-add-product" });
    addBtn.props.onPress();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/nutrition/search",
      params: { day: "2026-03-15" },
    });
  });
});
