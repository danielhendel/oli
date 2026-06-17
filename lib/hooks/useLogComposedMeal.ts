import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logTrackedMealNutrition } from "@/lib/api/usersMe";
import { getDeviceIanaTimeZone } from "@/lib/events/manualNutrition";
import {
  buildComposedMealNutritionPayload,
  type ComposedMealTotals,
} from "@/lib/nutrition/composedMealNutritionPayload";
import { NutritionQueue } from "@/lib/nutrition/NutritionQueue";
import type { DayKey } from "@/lib/ui/calendar/types";

export type ComposedMealLogStatus = "idle" | "submitting" | "success" | "error";

export type UseLogComposedMealResult = {
  status: ComposedMealLogStatus;
  errorMessage: string | null;
  queuedOffline: boolean;
  log: (args: {
    dayKey: DayKey;
    name: string;
    totals: ComposedMealTotals;
    itemCount: number;
  }) => Promise<{ ok: true; queued?: boolean } | { ok: false }>;
  reset: () => void;
};

/**
 * Logs a composed meal-builder meal to the selected day as ONE meal-scoped nutrition RawEvent.
 * Mirrors {@link useSubmitTrackedMealNutrition} (POST /ingest + idempotency + offline queue) but
 * sources its totals from the in-memory meal draft rather than a single food.
 */
export function useLogComposedMeal(timeZone?: string): UseLogComposedMealResult {
  const { getIdToken } = useAuth();
  const tz = timeZone?.trim() ? timeZone : getDeviceIanaTimeZone();

  const [status, setStatus] = useState<ComposedMealLogStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queuedOffline, setQueuedOffline] = useState(false);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setQueuedOffline(false);
  }, []);

  const log = useCallback(
    async (args: {
      dayKey: DayKey;
      name: string;
      totals: ComposedMealTotals;
      itemCount: number;
    }) => {
      setStatus("submitting");
      setErrorMessage(null);
      setQueuedOffline(false);
      const token = await getIdToken();
      if (!token) {
        setStatus("error");
        setErrorMessage("Not signed in");
        return { ok: false as const };
      }

      const payload = buildComposedMealNutritionPayload({
        dayKey: args.dayKey,
        timeZone: tz,
        observedAtIso: new Date().toISOString(),
        name: args.name,
        totals: args.totals,
        itemCount: args.itemCount,
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
      return { ok: false as const };
    },
    [getIdToken, tz],
  );

  return { status, errorMessage, queuedOffline, log, reset };
}
