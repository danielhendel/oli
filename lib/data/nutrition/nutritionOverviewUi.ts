/** Per-source UI state for Nutrition overview (no combined screen gate). */

/** Readiness is data truth only; `isLoading` is fetch / in-flight UI only. */
export type NutritionTodayFactsUi =
  | { readiness: "partial"; isLoading: boolean }
  | { readiness: "missing"; isLoading: false }
  | { readiness: "ready"; isLoading: false }
  | { readiness: "error"; isLoading: false; message: string; requestId: string | null };

export type NutritionEventsUi =
  | { readiness: "partial"; isLoading: boolean }
  | { readiness: "ready"; isLoading: false }
  | { readiness: "error"; isLoading: false; message: string; requestId: string | null };
