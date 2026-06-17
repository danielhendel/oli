import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { deleteIngestedRawEventAuthed } from "@/lib/api/ingest";
import { logTrackedMealNutrition } from "@/lib/api/usersMe";
import { buildEditedNutritionPayload } from "@/lib/nutrition/editNutritionLog";
import type { ManualNutritionPayload } from "@/lib/events/manualNutrition";
import type { MealSlot } from "@/lib/nutrition/mealSlot";

export type NutritionLogMutationStatus = "idle" | "working" | "error";

export type NutritionLogMutationsResult = {
  status: NutritionLogMutationStatus;
  errorMessage: string | null;
  /** Permanently removes a logged meal (manual nutrition RawEvent). */
  deleteLog: (rawEventId: string) => Promise<{ ok: boolean }>;
  /**
   * Edits a logged meal's time/occasion (macros preserved). Creates the updated
   * entry first, then removes the original so a failure never loses the meal.
   */
  updateLog: (args: {
    rawEventId: string;
    payload: ManualNutritionPayload;
    observedAtIso: string;
    mealSlot?: MealSlot;
  }) => Promise<{ ok: boolean }>;
  reset: () => void;
};

/**
 * Edit/delete for logged nutrition meals. No Firebase in screens — wraps the
 * authenticated `DELETE /ingest/:id` and tracked-meal `POST /ingest` endpoints.
 */
export function useNutritionLogMutations(): NutritionLogMutationsResult {
  const { getIdToken } = useAuth();
  const [status, setStatus] = useState<NutritionLogMutationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  const deleteLog = useCallback(
    async (rawEventId: string) => {
      setStatus("working");
      setErrorMessage(null);
      const token = await getIdToken();
      if (!token) {
        setStatus("error");
        setErrorMessage("Not signed in");
        return { ok: false };
      }
      const res = await deleteIngestedRawEventAuthed(rawEventId, token);
      if (res.ok) {
        setStatus("idle");
        return { ok: true };
      }
      setStatus("error");
      setErrorMessage(res.error);
      return { ok: false };
    },
    [getIdToken],
  );

  const updateLog = useCallback(
    async (args: {
      rawEventId: string;
      payload: ManualNutritionPayload;
      observedAtIso: string;
      mealSlot?: MealSlot;
    }) => {
      setStatus("working");
      setErrorMessage(null);
      const token = await getIdToken();
      if (!token) {
        setStatus("error");
        setErrorMessage("Not signed in");
        return { ok: false };
      }

      const nextPayload = buildEditedNutritionPayload(args.payload, {
        observedAtIso: args.observedAtIso,
        ...(args.mealSlot !== undefined ? { mealSlot: args.mealSlot } : {}),
      });

      const created = await logTrackedMealNutrition(nextPayload, token);
      if (!created.ok) {
        setStatus("error");
        setErrorMessage(created.error);
        return { ok: false };
      }

      // Remove the original. 404 = already gone (idempotent), still success.
      const del = await deleteIngestedRawEventAuthed(args.rawEventId, token);
      if (!del.ok) {
        setStatus("error");
        setErrorMessage(del.error);
        return { ok: false };
      }
      setStatus("idle");
      return { ok: true };
    },
    [getIdToken],
  );

  return { status, errorMessage, deleteLog, updateLog, reset };
}
