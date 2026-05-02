import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logTrackedMealNutrition } from "@/lib/api/usersMe";
import { getDeviceIanaTimeZone } from "@/lib/events/manualNutrition";
import {
  buildTrackedMealNutritionPayload,
  type NutritionIngestSource,
} from "@/lib/nutrition/trackedMealNutritionPayload";
import { NutritionQueue } from "@/lib/nutrition/NutritionQueue";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { MealSlot } from "@/lib/nutrition/mealSlot";

export type TrackedMealSubmitStatus = "idle" | "submitting" | "success" | "error";

export type UseSubmitTrackedMealNutritionResult = {
  status: TrackedMealSubmitStatus;
  errorMessage: string | null;
  requestId: string | null;
  queuedOffline: boolean;
  submit: (args: {
    dayKey: DayKey;
    food: NutritionFoodSearchItemDto;
    servingMultiplier: number;
    nutritionIngestSource: NutritionIngestSource;
    observedAtIso: string;
    mealSlot?: MealSlot;
  }) => Promise<{ ok: true; queued?: boolean } | { ok: false }>;
  reset: () => void;
};

/**
 * POST /ingest tracked meal (meal-scoped nutrition payload + idempotency).
 * Queues to {@link NutritionQueue} when the device is offline / request fails at network layer.
 */
export function useSubmitTrackedMealNutrition(timeZone?: string): UseSubmitTrackedMealNutritionResult {
  const { getIdToken } = useAuth();
  const tz = timeZone?.trim() ? timeZone : getDeviceIanaTimeZone();

  const [status, setStatus] = useState<TrackedMealSubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [queuedOffline, setQueuedOffline] = useState(false);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setRequestId(null);
    setQueuedOffline(false);
  }, []);

  const submit = useCallback(
    async (args: {
      dayKey: DayKey;
      food: NutritionFoodSearchItemDto;
      servingMultiplier: number;
      nutritionIngestSource: NutritionIngestSource;
      observedAtIso: string;
      mealSlot?: MealSlot;
    }) => {
      setErrorMessage(null);
      setRequestId(null);
      setQueuedOffline(false);
      setStatus("submitting");
      const token = await getIdToken();
      if (!token) {
        setStatus("error");
        setErrorMessage("Not signed in");
        return { ok: false as const };
      }

      const providerResponse: Record<string, unknown> = {
        provider: args.food.id.startsWith("oli:fg:")
          ? "oli_food_graph"
          : args.food.id.startsWith("nutritionix:")
            ? "nutritionix"
            : "dev_catalog",
        foodId: args.food.id,
        name: args.food.name,
        brand: args.food.brand ?? null,
        servingLabel: args.food.servingLabel,
      };

      const payload = buildTrackedMealNutritionPayload({
        dayKey: args.dayKey,
        timeZone: tz,
        observedAtIso: args.observedAtIso,
        food: args.food,
        servingMultiplier: args.servingMultiplier,
        nutritionIngestSource: args.nutritionIngestSource,
        providerResponse,
        ...(args.mealSlot !== undefined ? { mealSlot: args.mealSlot } : {}),
      });

      const res = await logTrackedMealNutrition(payload, token);
      if (res.ok) {
        setStatus("success");
        return { ok: true as const };
      }

      if (res.kind === "network") {
        await NutritionQueue.enqueue(payload);
        setStatus("success");
        setQueuedOffline(true);
        return { ok: true as const, queued: true };
      }

      setStatus("error");
      setErrorMessage(res.error);
      setRequestId(res.requestId);
      return { ok: false as const };
    },
    [getIdToken, tz],
  );

  return { status, errorMessage, requestId, queuedOffline, submit, reset };
}
