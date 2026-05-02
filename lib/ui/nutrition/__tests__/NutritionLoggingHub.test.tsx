/**
 * @jest-environment jsdom
 */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { NutritionLoggingHub } from "../NutritionLoggingHub";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/hooks/useNutritionMeta", () => ({
  useNutritionMeta: () => ({
    meta: null,
    loading: false,
    errorMessage: null,
    refresh: jest.fn(),
    save: jest.fn(),
    upsertRecent: jest.fn(),
    toggleFavorite: jest.fn(),
  }),
}));

describe("NutritionLoggingHub", () => {
  it("renders search-first actions and saved-meals placeholder", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <NutritionLoggingHub
          dayKey="2026-04-29"
          onOpenSearch={jest.fn()}
          onScanBarcode={jest.fn()}
          onQuickAdd={jest.fn()}
          onBuildMeal={jest.fn()}
        />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain("Search food, brand");
    expect(json).toContain("Scan barcode");
    expect(json).toContain("Quick add");
    expect(json).toContain("Build meal");
    expect(json).toContain("Saved meals coming soon");
  });
});
