// lib/data/nutrition/nutritionMealDraftStore.ts
/**
 * In-memory, client-side draft store for the Nutrition "New meal" builder.
 *
 * WHY THIS EXISTS: building a meal spans several sibling stack screens — the meal builder plus the
 * Add-item destinations (Search → Food detail, Kitchen, Supplements, Scan → Food detail). They all
 * contribute items to ONE draft, so a selection made on Food detail must be reflected back on the
 * builder when the user returns. Route params cannot safely carry an accumulating list of rich food
 * items across multiple hops, and the trust boundary forbids Firebase/API writes in screens. So this
 * is a deliberately small, framework-agnostic external store, mirroring
 * {@link ../program/workoutProgramDesignStore} (the established repo precedent).
 *
 * PERSISTENCE IS INTENTIONALLY DEFERRED: state is process-memory only. It survives navigation within
 * a session but resets on app reload. No IO is performed here. Nothing is written to the day until
 * the user taps "Add meal to day"; nothing becomes a reusable meal until "Save meal".
 */
import { useSyncExternalStore } from "react";
import type { FoodGraphSource, NutritionProductType } from "@oli/contracts/nutritionProduct";

/** Macros carried per draft item (fiber is display-only; saved meals do not persist fiber). */
export type NutritionMealDraftMacros = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
};

/** A single item staged in the meal draft (from search/kitchen/supplement/barcode/manual). */
export type NutritionMealDraftItem = {
  /** Stable local row id (never a server id). */
  id: string;
  label: string;
  /** Human serving line, e.g. "2 scoops", "150 g", "1 serving". */
  servingLabel: string;
  /** Totals for this item at the chosen serving (already scaled). */
  macros: NutritionMealDraftMacros;
  /** True for hand-entered rows (no underlying food). */
  manual: boolean;
  source?: FoodGraphSource;
  productType?: NutritionProductType;
  attributionRequired?: boolean;
  /** Canonical Oli Food Graph id when the item came from a graph food. */
  oliFoodId?: string;
};

export type NutritionMealDraft = {
  name: string;
  items: readonly NutritionMealDraftItem[];
};

export function buildEmptyNutritionMealDraft(): NutritionMealDraft {
  return { name: "", items: [] };
}

let currentDraft: NutritionMealDraft = buildEmptyNutritionMealDraft();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function setDraft(next: NutritionMealDraft): void {
  currentDraft = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): NutritionMealDraft {
  return currentDraft;
}

/** Imperative mutators. Each produces a new immutable draft and notifies subscribers. */
export const nutritionMealDraftStore = {
  getSnapshot,
  subscribe,
  /** Clear back to an empty draft (used after save / add-to-day and to start a fresh meal). */
  reset(): void {
    setDraft(buildEmptyNutritionMealDraft());
  },
  setName(name: string): void {
    if (name === currentDraft.name) return;
    setDraft({ ...currentDraft, name });
  },
  addItem(item: NutritionMealDraftItem): void {
    setDraft({ ...currentDraft, items: [...currentDraft.items, item] });
  },
  updateItem(id: string, patch: Partial<Omit<NutritionMealDraftItem, "id">>): void {
    setDraft({
      ...currentDraft,
      items: currentDraft.items.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    });
  },
  removeItem(id: string): void {
    setDraft({ ...currentDraft, items: currentDraft.items.filter((row) => row.id !== id) });
  },
} as const;

/** Subscribe a component to the live meal draft. */
export function useNutritionMealDraft(): NutritionMealDraft {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Caller-side row id generator (kept out of the store so it stays pure/deterministic in tests). */
export function newMealDraftItemId(): string {
  return `mealitem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
