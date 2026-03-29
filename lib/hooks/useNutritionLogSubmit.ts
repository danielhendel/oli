import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  type NutritionLogFormFields,
  validateNutritionLogForm,
} from "@/lib/nutrition/nutritionLogForm";
import { submitManualNutritionLog } from "@/lib/nutrition/submitManualNutritionLog";
import { getDeviceIanaTimeZone } from "@/lib/events/manualNutrition";

export type NutritionLogSubmitStatus = "idle" | "submitting" | "success" | "error";

export type UseNutritionLogSubmitResult = {
  status: NutritionLogSubmitStatus;
  errorMessage: string | null;
  requestId: string | null;
  fieldErrors: Partial<Record<keyof NutritionLogFormFields, string>>;
  submit: (fields: NutritionLogFormFields) => Promise<{ ok: true; dayKey: DayKey } | { ok: false }>;
  resetStatus: () => void;
};

/**
 * Validates form, POSTs manual nutrition ingest, surfaces field + network errors (no Firebase in UI).
 */
export function useNutritionLogSubmit(dayKey: DayKey, timeZone?: string): UseNutritionLogSubmitResult {
  const { getIdToken } = useAuth();
  const tz = timeZone?.trim() ? timeZone : getDeviceIanaTimeZone();

  const [status, setStatus] = useState<NutritionLogSubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof NutritionLogFormFields, string>>>({});

  const resetStatus = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setRequestId(null);
    setFieldErrors({});
  }, []);

  const submit = useCallback(
    async (fields: NutritionLogFormFields) => {
      setFieldErrors({});
      setErrorMessage(null);
      setRequestId(null);

      const v = validateNutritionLogForm(fields);
      if (!v.ok) {
        setFieldErrors(v.errors);
        return { ok: false as const };
      }

      setStatus("submitting");
      const token = await getIdToken(false);
      if (!token) {
        setStatus("error");
        setErrorMessage("Not signed in");
        return { ok: false as const };
      }

      const res = await submitManualNutritionLog({
        idToken: token,
        dayKey,
        timeZone: tz,
        values: v.values,
      });

      if (res.ok) {
        setStatus("success");
        return { ok: true as const, dayKey };
      }

      setStatus("error");
      setErrorMessage(res.error);
      setRequestId(res.requestId);
      return { ok: false as const };
    },
    [dayKey, getIdToken, tz],
  );

  return {
    status,
    errorMessage,
    requestId,
    fieldErrors,
    submit,
    resetStatus,
  };
}
