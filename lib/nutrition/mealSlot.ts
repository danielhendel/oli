/** UX + ingest tag for which eating occasion a meal log belongs to. */
export const MEAL_SLOT_LEGACY_VALUES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlotLegacy = (typeof MEAL_SLOT_LEGACY_VALUES)[number];

/** Numbered meal slots (View Food edit sheet + new logs). */
export const MEAL_SLOT_EDIT_VALUES = ["meal1", "meal2", "meal3", "meal4", "meal5", "meal6"] as const;
export type MealSlotEdit = (typeof MEAL_SLOT_EDIT_VALUES)[number];

/** All storable meal-slot values (legacy rows + numbered slots). */
export const MEAL_SLOT_VALUES = [...MEAL_SLOT_LEGACY_VALUES, ...MEAL_SLOT_EDIT_VALUES] as const;
export type MealSlot = (typeof MEAL_SLOT_VALUES)[number];

/** Legacy labels (food confirm / older flows). */
export const MEAL_SLOT_LABEL: Record<MealSlotLegacy, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** User-facing labels for the View Food edit sheet. */
export const MEAL_SLOT_EDIT_LABEL: Record<MealSlotEdit, string> = {
  meal1: "Meal 1",
  meal2: "Meal 2",
  meal3: "Meal 3",
  meal4: "Meal 4",
  meal5: "Meal 5",
  meal6: "Meal 6",
};

const LEGACY_TO_EDIT: Record<MealSlotLegacy, MealSlotEdit> = {
  breakfast: "meal1",
  lunch: "meal2",
  dinner: "meal3",
  snack: "meal4",
};

export function isMealSlot(v: string): v is MealSlot {
  return (MEAL_SLOT_VALUES as readonly string[]).includes(v);
}

export function isMealSlotEdit(v: string): v is MealSlotEdit {
  return (MEAL_SLOT_EDIT_VALUES as readonly string[]).includes(v);
}

/** Maps stored payload values (legacy or numbered) to an edit-sheet selection. */
export function normalizeMealSlotForEdit(slot: MealSlot | null | undefined): MealSlotEdit {
  if (slot == null) return "meal2";
  if (isMealSlotEdit(slot)) return slot;
  if ((MEAL_SLOT_LEGACY_VALUES as readonly string[]).includes(slot)) {
    return LEGACY_TO_EDIT[slot as MealSlotLegacy];
  }
  return "meal2";
}

/** Human-readable meal label for lists (View Food, timeline). */
export function formatMealSlotDisplayLabel(slot: string | undefined | null): string {
  if (!slot) return "";
  if (isMealSlotEdit(slot)) return MEAL_SLOT_EDIT_LABEL[slot];
  if ((MEAL_SLOT_LEGACY_VALUES as readonly string[]).includes(slot)) {
    return MEAL_SLOT_EDIT_LABEL[LEGACY_TO_EDIT[slot as MealSlotLegacy]];
  }
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}
