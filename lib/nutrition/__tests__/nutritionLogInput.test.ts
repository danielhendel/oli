import { sanitizeNutritionAmountInput } from "../nutritionLogInput";

describe("sanitizeNutritionAmountInput", () => {
  it("strips non-numeric characters", () => {
    expect(sanitizeNutritionAmountInput("abc2000")).toBe("2000");
  });

  it("allows a single decimal point", () => {
    expect(sanitizeNutritionAmountInput("12.5")).toBe("12.5");
  });

  it("collapses multiple dots into one decimal", () => {
    expect(sanitizeNutritionAmountInput("1..2")).toBe("1.2");
  });

  it("truncates fractional part to two digits", () => {
    expect(sanitizeNutritionAmountInput("12.345")).toBe("12.34");
  });
});
