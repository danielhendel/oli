/**
 * @jest-environment jsdom
 */
import { NutritionFoodLibrary } from "../NutritionFoodLibrary";

jest.mock("@/lib/hooks/useNutritionMeta", () => ({
  foodItemMetaFingerprint: (f: { id: string }) => f.id,
}));

describe("NutritionFoodLibrary", () => {
  it("exports a screen component", () => {
    expect(typeof NutritionFoodLibrary).toBe("function");
  });
});
