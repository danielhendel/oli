import React, { useEffect } from "react";
import renderer, { act } from "react-test-renderer";
import { useNutritionQuickLog } from "@/lib/hooks/useNutritionQuickLog";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";

const mockSubmit = jest.fn();
jest.mock("@/lib/hooks/useSubmitTrackedMealNutrition", () => ({
  useSubmitTrackedMealNutrition: () => ({
    status: "idle",
    errorMessage: null,
    requestId: null,
    queuedOffline: false,
    submit: mockSubmit,
    reset: jest.fn(),
  }),
}));

const mockUpsertRecent = jest.fn().mockResolvedValue(true);
jest.mock("@/lib/hooks/useNutritionMeta", () => ({
  useNutritionMeta: () => ({
    meta: null,
    loading: false,
    errorMessage: null,
    refresh: jest.fn(),
    save: jest.fn(),
    upsertRecent: mockUpsertRecent,
    toggleFavorite: jest.fn(),
  }),
}));

const mockGetFoodById = jest.fn();
jest.mock("@/lib/nutrition/defaultFoodProvider", () => ({
  createDefaultFoodProvider: () => ({
    getFoodById: mockGetFoodById,
    searchFoods: jest.fn(),
    getFoodByBarcode: jest.fn(),
  }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ getIdToken: jest.fn().mockResolvedValue("token") }),
}));

const food: NutritionFoodSearchItemDto = {
  id: "oli:fg:banana",
  name: "Banana",
  servingLabel: "1 medium",
  caloriesKcal: 105,
  proteinG: 1.3,
  carbsG: 27,
  fatG: 0.4,
};

type HarnessProps = {
  onReady: (api: ReturnType<typeof useNutritionQuickLog>) => void;
};

function Harness({ onReady }: HarnessProps) {
  const api = useNutritionQuickLog();
  useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}

describe("useNutritionQuickLog", () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    mockUpsertRecent.mockClear();
    mockGetFoodById.mockReset();
    mockSubmit.mockResolvedValue({ ok: true });
  });

  it("logs a food target immediately with the selected day", async () => {
    let api!: ReturnType<typeof useNutritionQuickLog>;
    await act(async () => {
      renderer.create(<Harness onReady={(a) => { api = a; }} />);
    });
    await act(async () => {
      const r = await api.quickLog({ kind: "food", food }, "2026-03-15");
      expect(r.ok).toBe(true);
    });
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        dayKey: "2026-03-15",
        food,
        servingMultiplier: 1,
        nutritionIngestSource: "search",
      }),
    );
    expect(mockUpsertRecent).toHaveBeenCalledWith(food);
  });

  it("respects a custom serving multiplier on pantry quick-log", async () => {
    let api!: ReturnType<typeof useNutritionQuickLog>;
    await act(async () => {
      renderer.create(<Harness onReady={(a) => { api = a; }} />);
    });
    await act(async () => {
      await api.quickLog({ kind: "food", food, servingMultiplier: 2 }, "2026-03-15");
    });
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ servingMultiplier: 2 }));
  });

  it("resolves a ref target via the food provider before logging", async () => {
    mockGetFoodById.mockResolvedValue(food);
    let api!: ReturnType<typeof useNutritionQuickLog>;
    await act(async () => {
      renderer.create(<Harness onReady={(a) => { api = a; }} />);
    });
    await act(async () => {
      const r = await api.quickLog({ kind: "ref", id: "oli:fg:banana" }, "2026-03-15");
      expect(r.ok).toBe(true);
    });
    expect(mockGetFoodById).toHaveBeenCalledWith("oli:fg:banana");
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ food }));
  });

  it("returns ok:false when submit fails", async () => {
    mockSubmit.mockResolvedValue({ ok: false });
    let api!: ReturnType<typeof useNutritionQuickLog>;
    await act(async () => {
      renderer.create(<Harness onReady={(a) => { api = a; }} />);
    });
    await act(async () => {
      const r = await api.quickLog({ kind: "food", food }, "2026-03-15");
      expect(r.ok).toBe(false);
    });
    expect(mockUpsertRecent).not.toHaveBeenCalled();
  });
});
