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
};

const mockGetFoodById = jest.fn();
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

jest.mock("@/lib/hooks/useSubmitTrackedMealNutrition", () => ({
  useSubmitTrackedMealNutrition: () => ({
    status: "idle",
    errorMessage: null,
    queuedOffline: false,
    submit: jest.fn().mockResolvedValue({ ok: true }),
    reset: jest.fn(),
  }),
}));

jest.mock("@/lib/hooks/useNutritionPantry", () => ({
  useNutritionPantry: () => ({
    addItem: jest.fn().mockResolvedValue(true),
    errorMessage: null,
  }),
}));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: "success" },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ foodId: "oli:fg:banana", day: "2026-03-15" }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

import NutritionFoodConfirmScreen from "../food/[foodId]";
import { FoodProviderNotFoundError } from "@/lib/nutrition/FoodProviderClient";

function flatStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  return Array.isArray(style) ? Object.assign({}, ...style) : (style as Record<string, unknown>);
}

describe("NutritionFoodConfirmScreen — dark theme readability", () => {
  beforeEach(() => {
    mockGetFoodById.mockReset();
    mockGetFoodById.mockResolvedValue(mockFood);
  });

  async function renderScreen(): Promise<renderer.ReactTestRenderer> {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionFoodConfirmScreen />);
      await Promise.resolve();
    });
    return tree;
  }

  it("shows food name with readable dark-theme primary text color", async () => {
    const tree = await renderScreen();

    const title = tree.root.findByProps({ testID: "food-detail-title" });
    expect(title.props.children).toBe("Banana");
    expect(flatStyle(title.props.style).color).toBe("#F7F8FA");
  });

  it("shows macro summary with readable dark-theme text color", async () => {
    const tree = await renderScreen();

    const summary = tree.root.findByProps({ testID: "serving-nutrition-summary" });
    const summaryText = summary.findByType(Text);
    expect(flatStyle(summaryText.props.style).color).toBe("#F7F8FA");
    expect(summary.props.accessibilityLiveRegion).toBe("polite");
  });

  it("shows load error with readable text and background colors", async () => {
    mockGetFoodById.mockRejectedValue(new FoodProviderNotFoundError("food", "oli:fg:banana"));

    const tree = await renderScreen();

    const errorBox = tree.root.findByProps({ testID: "food-detail-load-error" });
    expect(errorBox.props.accessibilityRole).toBe("alert");
    expect(errorBox.props.accessibilityLiveRegion).toBe("polite");

    const texts = errorBox.findAllByType(Text);
    const title = texts.find((n) => n.props.children === "Could not load food");
    const body = texts.find((n) => n.props.children === "Food not found.");
    expect(flatStyle(title?.props.style).color).toBe("#FF6961");
    expect(flatStyle(body?.props.style).color).toBe("#F7F8FA");
    expect(flatStyle(errorBox.props.style).backgroundColor).toBe("rgba(255, 69, 58, 0.14)");
  });
});
