import React from "react";
import { Text } from "react-native";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1" }, initializing: false, getIdToken: jest.fn().mockResolvedValue("t") }),
}));

jest.mock("@/lib/hooks/useNutritionFoodSearchQuery", () => ({
  useNutritionFoodSearchQuery: () => ({
    query: "",
    setQuery: jest.fn(),
    debouncedQuery: "",
    items: [
      {
        id: "oli:fg:open-yogurt",
        name: "Greek yogurt",
        brand: "BrandCo",
        servingLabel: "1 cup",
        caloriesKcal: 100,
        proteinG: 17,
        carbsG: 6,
        fatG: 0.7,
        source: "open",
        attributionRequired: true,
      },
    ],
    status: "success",
    errorMessage: null,
    refresh: jest.fn(),
  }),
}));

let mockMeta: unknown = null;
jest.mock("@/lib/hooks/useNutritionMeta", () => ({
  useNutritionMeta: () => ({ meta: mockMeta, loading: false, errorMessage: null }),
}));

const mockQuickLog = jest.fn().mockResolvedValue({ ok: true, queued: false });
jest.mock("@/lib/hooks/useNutritionQuickLog", () => ({
  useNutritionQuickLog: () => ({ pendingId: null, errorMessage: null, quickLog: mockQuickLog }),
}));

jest.mock("@/lib/hooks/useAddFoodToMealDraft", () => ({
  useAddFoodToMealDraft: () => ({ pendingId: null, errorMessage: null, addToDraft: jest.fn() }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ day: "2026-03-15" }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

import NutritionFoodSearchScreen from "../search";

describe("NutritionFoodSearchScreen — production UX", () => {
  beforeEach(() => {
    mockMeta = null;
    mockQuickLog.mockClear();
  });

  it("uses production copy and surfaces source + attribution", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionFoodSearchScreen />);
    });
    const input = tree!.root.findByProps({ accessibilityLabel: "Food search" });
    expect(input.props.placeholder).toBe("Search foods, brands, and supplements");
    const texts = tree!.root.findAllByType(Text).map((n) => {
      const json = n.props.children;
      return typeof json === "string" ? json : Array.isArray(json) ? json.join("") : "";
    });
    const joined = texts.join("|");
    expect(joined).not.toContain("dev food catalog");
    expect(joined).toContain("Greek yogurt");
    expect(joined).toContain("Open Food Facts");
  });

  it("renders lightweight Quick add chips that quick-log on tap (no floating blue Log buttons)", async () => {
    mockMeta = {
      favoriteFoods: [{ id: "f1", foodHash: "h1", name: "Eggs", lastUsedAt: 1 }],
      recentFoods: [{ id: "r1", foodHash: "h2", name: "Banana", lastUsedAt: 2 }],
    };
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionFoodSearchScreen />);
    });

    const labels = tree!.root
      .findAll((n) => typeof n.props.accessibilityLabel === "string")
      .map((n) => n.props.accessibilityLabel as string);
    expect(labels).toContain("Quick log Eggs");
    expect(labels).toContain("Quick log Banana");
    expect(labels).toContain("Open My Kitchen");

    const chip = tree!.root.findByProps({ testID: "quickadd-chip-h1" });
    await act(async () => {
      chip.props.onPress();
    });
    expect(mockQuickLog).toHaveBeenCalledWith({ kind: "ref", id: "f1" }, "2026-03-15");
  });

  it("uses dark-theme primary text color on food names for contrast", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionFoodSearchScreen />);
    });
    const nameNode = tree!.root.findAll(
      (n) => n.type === Text && n.props.children === "Greek yogurt",
    )[0];
    const flat = Array.isArray(nameNode.props.style)
      ? Object.assign({}, ...nameNode.props.style)
      : nameNode.props.style;
    expect(flat.color).toBe("#F7F8FA");
  });
});
