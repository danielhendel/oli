import { useCallback, useMemo, useState } from "react";

import { deleteIngestedRawEventAuthed } from "@/lib/api/ingest";
import { logWeight } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import { buildManualWeightPayload } from "@/lib/events/manualWeight";
import { emitRefresh } from "@/lib/navigation/refreshBus";

const LBS_PER_KG = 2.2046226218;

export type BodyWeightLogMutationResult =
  | { ok: true }
  | { ok: false; message: string };

export function useBodyWeightLogMutations() {
  const { getIdToken } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const reset = useCallback(() => {
    setErrorMessage(null);
    setIsBusy(false);
  }, []);

  const deleteEntry = useCallback(
    async (rawEventId: string): Promise<BodyWeightLogMutationResult> => {
      setIsBusy(true);
      setErrorMessage(null);
      try {
        const token = await getIdToken(false);
        if (!token) return { ok: false, message: "No auth token" };
        const res = await deleteIngestedRawEventAuthed(rawEventId, token);
        if (!res.ok) {
          const message = res.error ?? "Could not remove entry";
          setErrorMessage(message);
          return { ok: false, message };
        }
        emitRefresh("commandCenter", `${Date.now()}`);
        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setErrorMessage(message);
        return { ok: false, message };
      } finally {
        setIsBusy(false);
      }
    },
    [getIdToken],
  );

  const updateEntry = useCallback(
    async (args: {
      rawEventId: string;
      observedAtIso: string;
      weightLbs: number;
      bodyFatPercent?: number | null;
      timezone: string;
    }): Promise<BodyWeightLogMutationResult> => {
      setIsBusy(true);
      setErrorMessage(null);
      try {
        const token = await getIdToken(false);
        if (!token) return { ok: false, message: "No auth token" };
        const payload = buildManualWeightPayload({
          time: args.observedAtIso,
          timezone: args.timezone,
          weightLbs: args.weightLbs,
          ...(args.bodyFatPercent !== undefined ? { bodyFatPercent: args.bodyFatPercent } : {}),
        });
        const created = await logWeight(payload, token);
        if (!created.ok) {
          setErrorMessage(created.error);
          return { ok: false, message: created.error };
        }
        const deleted = await deleteIngestedRawEventAuthed(args.rawEventId, token);
        if (!deleted.ok) {
          const message = deleted.error ?? "Updated weight but could not remove the previous entry";
          setErrorMessage(message);
          return { ok: false, message };
        }
        const weightKg = args.weightLbs / LBS_PER_KG;
        emitRefresh("commandCenter", `${Date.now()}`, { optimisticWeightKg: weightKg });
        return { ok: true };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setErrorMessage(message);
        return { ok: false, message };
      } finally {
        setIsBusy(false);
      }
    },
    [getIdToken],
  );

  return useMemo(
    () => ({
      deleteEntry,
      updateEntry,
      errorMessage,
      isBusy,
      reset,
    }),
    [deleteEntry, updateEntry, errorMessage, isBusy, reset],
  );
}
