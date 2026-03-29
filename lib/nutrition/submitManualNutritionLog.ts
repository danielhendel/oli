import { logNutrition } from "@/lib/api/usersMe";
import { buildManualNutritionPayload } from "@/lib/events/manualNutrition";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { NutritionLogParsed } from "./nutritionLogForm";

export type SubmitManualNutritionLogArgs = {
  idToken: string;
  dayKey: DayKey;
  timeZone: string;
  values: NutritionLogParsed;
};

/**
 * Builds canonical manual payload + POST /ingest (same envelope as weight / strength_workout).
 */
export function submitManualNutritionLog(args: SubmitManualNutritionLogArgs) {
  const payload = buildManualNutritionPayload({
    dayKey: args.dayKey,
    timeZone: args.timeZone,
    totalKcal: args.values.totalKcal,
    proteinG: args.values.proteinG,
    carbsG: args.values.carbsG,
    fatG: args.values.fatG,
    fiberG: args.values.fiberG,
  });
  return logNutrition(payload, args.idToken);
}
