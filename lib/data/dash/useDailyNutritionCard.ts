import { useMemo } from "react";

import { useDailyFacts } from "@/lib/data/useDailyFacts";
import {
  buildDailyNutritionCardModel,
  type DailyNutritionCardModel,
} from "@/lib/data/dash/buildDailyNutritionCardModel";

export type UseDailyNutritionCardResult = {
  model: DailyNutritionCardModel;
  loading: boolean;
  error: string | null;
};

export function useDailyNutritionCard(day: string): UseDailyNutritionCardResult {
  const facts = useDailyFacts(day);

  return useMemo(() => {
    if (facts.status === "ready") {
      return {
        model: buildDailyNutritionCardModel(facts.data.nutrition),
        loading: false,
        error: null,
      };
    }

    return {
      model: buildDailyNutritionCardModel(undefined),
      loading: facts.status === "partial",
      error: facts.status === "error" ? facts.error : null,
    };
  }, [facts]);
}
