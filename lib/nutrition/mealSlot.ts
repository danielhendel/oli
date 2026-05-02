/** UX + ingest tag for which eating occasion a meal log belongs to (optional on legacy rows). */
export const MEAL_SLOT_VALUES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof MEAL_SLOT_VALUES)[number];

export const MEAL_SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function isMealSlot(v: string): v is MealSlot {
  return (MEAL_SLOT_VALUES as readonly string[]).includes(v);
}
