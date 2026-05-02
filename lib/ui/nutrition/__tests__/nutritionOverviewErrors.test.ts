import { friendlyNutritionOverviewErrorMessage } from "../nutritionOverviewErrors";

describe("friendlyNutritionOverviewErrorMessage", () => {
  it("maps invalid query / 400 style messages", () => {
    expect(friendlyNutritionOverviewErrorMessage("HTTP 400 INVALID_QUERY")).toContain("couldn’t load");
  });

  it("maps network style messages", () => {
    expect(friendlyNutritionOverviewErrorMessage("network request failed")).toContain("connection");
  });

  it("falls back for unknown errors", () => {
    expect(friendlyNutritionOverviewErrorMessage("something weird")).toContain("couldn’t load");
  });
});
