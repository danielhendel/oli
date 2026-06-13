import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/lib/hooks/useNutritionFoodSearchQuery", () => ({
  useNutritionFoodSearchQuery: () => ({
    query: "",
    setQuery: jest.fn(),
    debouncedQuery: "",
    items: [
      {
        id: "oli:fg:creatine",
        name: "Creatine",
        servingLabel: "1 scoop",
        caloriesKcal: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        productType: "supplement",
        source: "curated",
      },
    ],
    status: "success",
    errorMessage: null,
    refresh: jest.fn(),
  }),
}));

jest.mock("@/lib/hooks/useNutritionMeta", () => ({
  useNutritionMeta: () => ({
    meta: { favoriteFoods: [], recentFoods: [] },
    loading: false,
    errorMessage: null,
    toggleFavorite: jest.fn(),
  }),
  foodItemMetaFingerprint: () => "fp1",
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

import NutritionSupplementsScreen from "../supplements";

describe("NutritionSupplementsScreen", () => {
  beforeEach(() => {
    mockQuickLog.mockClear();
    mockPush.mockClear();
  });

  it("shows supplement dose unit and logs on tap", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionSupplementsScreen />);
    });
    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain("Creatine");
    expect(flat).toContain("1 scoop");
    expect(flat).toContain("Supplement");

    const logBtn = tree!.root.findByProps({ testID: "supplement-log-oli:fg:creatine" });
    await act(async () => {
      logBtn.props.onPress();
    });
    expect(mockQuickLog).toHaveBeenCalledWith(
      {
        kind: "food",
        food: expect.objectContaining({ id: "oli:fg:creatine", name: "Creatine" }),
      },
      "2026-03-15",
      { nutritionIngestSource: "search" },
    );
  });

  it("passes the selected day when opening food detail", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionSupplementsScreen />);
    });
    const openBtn = tree!.root.findByProps({ accessibilityLabel: "Open Creatine to adjust dose" });
    openBtn.props.onPress();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/nutrition/food/[foodId]",
      params: { foodId: "oli:fg:creatine", day: "2026-03-15" },
    });
  });
});
