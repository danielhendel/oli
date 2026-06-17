import {
  formatMealSlotDisplayLabel,
  MEAL_SLOT_EDIT_LABEL,
  normalizeMealSlotForEdit,
} from "@/lib/nutrition/mealSlot";

describe("mealSlot display + edit mapping", () => {
  it("maps legacy values to Meal 1–4 labels", () => {
    expect(formatMealSlotDisplayLabel("breakfast")).toBe("Meal 1");
    expect(formatMealSlotDisplayLabel("lunch")).toBe("Meal 2");
    expect(formatMealSlotDisplayLabel("dinner")).toBe("Meal 3");
    expect(formatMealSlotDisplayLabel("snack")).toBe("Meal 4");
  });

  it("shows numbered meal labels directly", () => {
    expect(formatMealSlotDisplayLabel("meal5")).toBe("Meal 5");
    expect(formatMealSlotDisplayLabel("meal6")).toBe("Meal 6");
  });

  it("normalizes legacy slots for the edit sheet", () => {
    expect(normalizeMealSlotForEdit("breakfast")).toBe("meal1");
    expect(normalizeMealSlotForEdit("lunch")).toBe("meal2");
    expect(normalizeMealSlotForEdit("dinner")).toBe("meal3");
    expect(normalizeMealSlotForEdit("snack")).toBe("meal4");
    expect(normalizeMealSlotForEdit("meal5")).toBe("meal5");
    expect(normalizeMealSlotForEdit(null)).toBe("meal2");
  });

  it("exposes Meal 1–6 edit labels", () => {
    expect(MEAL_SLOT_EDIT_LABEL.meal1).toBe("Meal 1");
    expect(MEAL_SLOT_EDIT_LABEL.meal6).toBe("Meal 6");
  });
});
