/**
 * Nutrition Quick Add (log): standalone macro entry — no library hub chrome.
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("t"),
  }),
}));

jest.mock("@/lib/hooks/useNutritionLoggingScreenState", () => ({
  useNutritionLoggingScreenState: () => ({
    mode: "quick" as const,
    setMode: jest.fn(),
    draft: {
      totalKcal: "",
      proteinG: "",
      carbsG: "",
      fatG: "",
      fiberG: "",
    },
    canSubmit: true,
    status: "idle" as const,
    errorMessage: null,
    requestId: null,
    displayedFieldErrors: {},
    onChangeDraftField: jest.fn(() => jest.fn()),
    onBlurDraftField: jest.fn(() => jest.fn()),
    save: jest.fn().mockResolvedValue({ ok: false as const }),
    dismissError: jest.fn(),
    retrySave: jest.fn().mockResolvedValue({ ok: false as const }),
    meal: {
      rows: [],
      addRow: jest.fn(),
      removeRow: jest.fn(),
      updateRow: jest.fn(),
      clearMeal: jest.fn(),
      totalsResult: {
        ok: true as const,
        totals: { totalKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
        isEmpty: true,
      },
    },
    addMealToDay: () => ({ ok: true as const }),
    recentItems: [],
    applyRecentItem: jest.fn(),
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ day: "2026-03-15" }),
  useNavigation: () => ({
    setOptions: jest.fn(),
    goBack: jest.fn(),
  }),
}));

import NutritionLogScreen from "../log";

function flattenJson(node: unknown): string {
  return JSON.stringify(node);
}

describe("NutritionLogScreen (Quick Add)", () => {
  it("does not render hub / library navigation chrome", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionLogScreen />);
    });
    const flat = flattenJson(tree!.toJSON());
    expect(flat).not.toMatch(/Food library/i);
    expect(flat).not.toContain("Build Meal");
    expect(flat).not.toContain("Recent");
    expect(flat).not.toMatch(/Search food/i);
    expect(flat).not.toMatch(/Scan barcode/i);
    expect(flat).not.toContain("Log nutrition");
  });

  it("renders helper copy, macro labels, and Save day", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionLogScreen />);
    });
    const flat = flattenJson(tree!.toJSON());
    expect(flat).toContain("Enter calories and macros for this day.");
    expect(flat).toContain("Calories");
    expect(flat).toContain("Protein");
    expect(flat).toContain("Carbs");
    expect(flat).toContain("Fat");
    expect(flat).toContain("Fiber");
    expect(flat).toContain("Save day");
  });
});
