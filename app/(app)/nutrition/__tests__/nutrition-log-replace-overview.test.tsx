/**
 * After logging from the nutrition log hub, navigation resets to the overview (not day details).
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

const mockReplace = jest.fn();

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

jest.mock("@/lib/ui/nutrition/NutritionLogEntryShell", () => {
  const React = require("react") as typeof import("react");
  return {
    NutritionLogEntryShell: (props: { onLogged: (d: string) => void }) => {
      React.useEffect(() => {
        props.onLogged("2026-04-30");
      }, [props.onLogged]);
      return null;
    },
  };
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({ day: "2026-04-30" }),
  useNavigation: () => ({
    setOptions: jest.fn(),
    goBack: jest.fn(),
  }),
}));

import NutritionLogScreen from "../log";

describe("NutritionLogScreen navigation after log", () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it("replaces stack with nutrition overview and logged params", async () => {
    await act(async () => {
      renderer.create(<NutritionLogScreen />);
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(app)/nutrition",
      params: { logged: "1", day: "2026-04-30" },
    });
  });
});
