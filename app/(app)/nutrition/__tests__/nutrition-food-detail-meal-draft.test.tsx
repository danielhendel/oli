import React from "react";
import { Text } from "react-native";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGetIdToken = jest.fn().mockResolvedValue("token");
jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ getIdToken: mockGetIdToken }),
}));

const mockFood = {
  id: "oli:fg:banana",
  name: "Banana",
  brand: "Fresh",
  servingLabel: "1 medium",
  caloriesKcal: 105,
  proteinG: 1.3,
  carbsG: 27,
  fatG: 0.4,
  fiberG: 3.1,
  basis: "mass" as const,
  per100g: { caloriesKcal: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3, fiberG: 2.6 },
  servings: [{ id: "medium", label: "1 medium", grams: 118, unit: "piece" as const, isDefault: true }],
  source: "usda" as const,
  productType: "food" as const,
};

const mockGetFoodById = jest.fn().mockResolvedValue(mockFood);
jest.mock("@/lib/nutrition/defaultFoodProvider", () => ({
  createDefaultFoodProvider: () => ({
    getFoodById: mockGetFoodById,
    searchFoods: jest.fn(),
    getFoodByBarcode: jest.fn(),
  }),
}));

jest.mock("@/lib/hooks/useNutritionMeta", () => ({
  useNutritionMeta: () => ({
    meta: { favoriteFoods: [], recentFoods: [] },
    loading: false,
    errorMessage: null,
    toggleFavorite: jest.fn(),
    upsertRecent: jest.fn(),
  }),
  foodItemMetaFingerprint: () => "fp-banana",
}));

const mockSubmit = jest.fn().mockResolvedValue({ ok: true });
jest.mock("@/lib/hooks/useSubmitTrackedMealNutrition", () => ({
  useSubmitTrackedMealNutrition: () => ({
    status: "idle",
    errorMessage: null,
    queuedOffline: false,
    submit: mockSubmit,
    reset: jest.fn(),
  }),
}));

jest.mock("@/lib/hooks/useNutritionPantry", () => ({
  useNutritionPantry: () => ({ addItem: jest.fn().mockResolvedValue(true), errorMessage: null }),
}));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: "success" },
}));

const mockDismissTo = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), dismissTo: mockDismissTo, back: jest.fn() }),
  useLocalSearchParams: () => ({ foodId: "oli:fg:banana", day: "2026-03-15", mode: "mealDraft" }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

import NutritionFoodConfirmScreen from "../food/[foodId]";
import { nutritionMealDraftStore } from "@/lib/data/nutrition/nutritionMealDraftStore";

async function renderScreen(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<NutritionFoodConfirmScreen />);
    await Promise.resolve();
  });
  return tree;
}

describe("NutritionFoodConfirmScreen — meal-draft mode", () => {
  beforeEach(() => {
    nutritionMealDraftStore.reset();
    mockDismissTo.mockClear();
    mockSubmit.mockClear();
  });

  it("shows 'Add to Meal' instead of 'Log meal'", async () => {
    const tree = await renderScreen();
    expect(tree.root.findByProps({ testID: "food-add-to-meal" })).toBeTruthy();
    expect(tree.root.findAllByProps({ testID: "food-log-meal" })).toHaveLength(0);
  });

  it("adds the resolved food to the meal draft and returns to the builder", async () => {
    const tree = await renderScreen();
    await act(async () => {
      tree.root.findByProps({ testID: "food-add-to-meal" }).props.onPress();
      await Promise.resolve();
    });

    const items = nutritionMealDraftStore.getSnapshot().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.label).toBe("Banana");
    expect(items[0]?.macros.caloriesKcal).toBeGreaterThan(0);
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(mockDismissTo).toHaveBeenCalledWith({
      pathname: "/(app)/nutrition/meal/new",
      params: { day: "2026-03-15" },
    });
  });

  it("does not render the meal-type selector in draft mode", async () => {
    const tree = await renderScreen();
    const labels = tree.root.findAllByType(Text).filter((t) => t.props.children === "Meal type");
    expect(labels).toHaveLength(0);
  });
});
