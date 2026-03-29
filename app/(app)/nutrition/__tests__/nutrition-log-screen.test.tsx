/**
 * Nutrition log: thin screen wires day key + shell + logging state hook.
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

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
    canSubmit: false,
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

jest.mock("@/lib/ui/nutrition/NutritionLogEntryShell", () => ({
  NutritionLogEntryShell: () => null,
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

describe("NutritionLogScreen", () => {
  it("renders without throwing", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionLogScreen />);
    });
    expect(tree!.toJSON()).toBeNull();
  });
});
