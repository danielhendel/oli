import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  type NutritionLogFormFields,
  validateNutritionLogForm,
} from "@/lib/nutrition/nutritionLogForm";
import { sanitizeNutritionAmountInput } from "@/lib/nutrition/nutritionLogInput";
import { useNutritionLogSubmit } from "@/lib/hooks/useNutritionLogSubmit";
import { useNutritionMealBuilder } from "@/lib/hooks/useNutritionMealBuilder";
import { mergeMealTotalsIntoDraftFields } from "@/lib/data/nutrition/nutritionDayDraftMerge";
import type { NutritionRecentLoggingItem } from "@/lib/data/nutrition/buildNutritionRecentLoggingItems";
import type { NutritionLogParsed } from "@/lib/nutrition/nutritionLogForm";
import {
  nutritionParsedToRecentItem,
  recentItemToDraftFields,
} from "@/lib/data/nutrition/buildNutritionRecentLoggingItems";
import {
  appendNutritionRecentLoggingItem,
  loadNutritionRecentLoggingItems,
} from "@/lib/data/nutrition/nutritionRecentLoggingStore";

const emptyDraft: NutritionLogFormFields = {
  totalKcal: "",
  proteinG: "",
  carbsG: "",
  fatG: "",
  fiberG: "",
};

export const NUTRITION_LOGGING_FIELD_ORDER: (keyof NutritionLogFormFields)[] = [
  "totalKcal",
  "proteinG",
  "carbsG",
  "fatG",
  "fiberG",
];

export type NutritionLoggingMode = "quick" | "meal" | "recent";

export type UseNutritionLoggingScreenStateResult = {
  mode: NutritionLoggingMode;
  setMode: (m: NutritionLoggingMode) => void;
  draft: NutritionLogFormFields;
  canSubmit: boolean;
  status: ReturnType<typeof useNutritionLogSubmit>["status"];
  errorMessage: string | null;
  requestId: string | null;
  displayedFieldErrors: Partial<Record<keyof NutritionLogFormFields, string>>;
  onChangeDraftField: (key: keyof NutritionLogFormFields) => (text: string) => void;
  onBlurDraftField: (key: keyof NutritionLogFormFields) => () => void;
  save: () => Promise<{ ok: true; dayKey: DayKey } | { ok: false }>;
  dismissError: () => void;
  retrySave: () => Promise<{ ok: true; dayKey: DayKey } | { ok: false }>;
  meal: ReturnType<typeof useNutritionMealBuilder>;
  addMealToDay: () => { ok: true } | { ok: false; message: string };
  recentItems: NutritionRecentLoggingItem[];
  applyRecentItem: (item: NutritionRecentLoggingItem) => void;
};

export function useNutritionLoggingScreenState(dayKey: DayKey): UseNutritionLoggingScreenStateResult {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const { status, errorMessage, requestId, fieldErrors: hookFieldErrors, submit, resetStatus } =
    useNutritionLogSubmit(dayKey);

  const [mode, setMode] = useState<NutritionLoggingMode>("quick");
  const [draft, setDraft] = useState<NutritionLogFormFields>(emptyDraft);
  const [touched, setTouched] = useState<Partial<Record<keyof NutritionLogFormFields, boolean>>>({});
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [recentItems, setRecentItems] = useState<NutritionRecentLoggingItem[]>([]);

  const meal = useNutritionMealBuilder();

  useEffect(() => {
    if (!uid) {
      setRecentItems([]);
      return;
    }
    void loadNutritionRecentLoggingItems(uid).then(setRecentItems);
  }, [uid]);

  useEffect(() => {
    setDraft(emptyDraft);
    setTouched({});
    setSaveAttempted(false);
    setMode("quick");
    meal.clearMeal();
    resetStatus();
  }, [dayKey, resetStatus, meal.clearMeal]);

  const validation = useMemo(() => validateNutritionLogForm(draft), [draft]);
  const canSubmit = validation.ok && status !== "submitting";

  const displayedFieldErrors = useMemo((): Partial<Record<keyof NutritionLogFormFields, string>> => {
    if (Object.keys(hookFieldErrors).length > 0) return hookFieldErrors;
    if (!validation.ok && saveAttempted) return validation.errors;
    if (!validation.ok) {
      const out: Partial<Record<keyof NutritionLogFormFields, string>> = {};
      for (const k of NUTRITION_LOGGING_FIELD_ORDER) {
        if (touched[k] && validation.errors[k]) {
          out[k] = validation.errors[k]!;
        }
      }
      return out;
    }
    return {};
  }, [hookFieldErrors, validation, touched, saveAttempted]);

  const onChangeDraftField = useCallback(
    (key: keyof NutritionLogFormFields) => (text: string) => {
      resetStatus();
      setDraft((f) => ({ ...f, [key]: sanitizeNutritionAmountInput(text) }));
    },
    [resetStatus],
  );

  const onBlurDraftField = useCallback((key: keyof NutritionLogFormFields) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
  }, []);

  const persistRecentAfterSuccess = useCallback(
    async (values: NutritionLogParsed) => {
      if (!uid) return;
      const item = nutritionParsedToRecentItem({
        id: `recent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        savedAt: new Date().toISOString(),
        dayKey,
        values,
      });
      await appendNutritionRecentLoggingItem(uid, item);
      const next = await loadNutritionRecentLoggingItems(uid);
      setRecentItems(next);
    },
    [uid, dayKey],
  );

  const save = useCallback(async () => {
    setSaveAttempted(true);
    const r = await submit(draft);
    if (r.ok) {
      const v = validateNutritionLogForm(draft);
      if (v.ok) void persistRecentAfterSuccess(v.values);
    }
    return r;
  }, [submit, draft, persistRecentAfterSuccess]);

  const retrySave = useCallback(async () => {
    const r = await submit(draft);
    if (r.ok) {
      const v = validateNutritionLogForm(draft);
      if (v.ok) void persistRecentAfterSuccess(v.values);
    }
    return r;
  }, [submit, draft, persistRecentAfterSuccess]);

  const addMealToDay = useCallback((): { ok: true } | { ok: false; message: string } => {
    const built = meal.totalsResult;
    if (!built.ok) return { ok: false, message: built.error };
    if (built.isEmpty) return { ok: false, message: "Add at least one item with calories or macros." };
    resetStatus();
    setDraft((d) => mergeMealTotalsIntoDraftFields(d, built.totals));
    meal.clearMeal();
    setMode("quick");
    return { ok: true };
  }, [meal, resetStatus]);

  const applyRecentItem = useCallback(
    (item: NutritionRecentLoggingItem) => {
      resetStatus();
      setDraft(recentItemToDraftFields(item));
      setTouched({});
      setSaveAttempted(false);
      setMode("quick");
    },
    [resetStatus],
  );

  return {
    mode,
    setMode,
    draft,
    canSubmit,
    status,
    errorMessage,
    requestId,
    displayedFieldErrors,
    onChangeDraftField,
    onBlurDraftField,
    save,
    dismissError: resetStatus,
    retrySave,
    meal,
    addMealToDay,
    recentItems,
    applyRecentItem,
  };
}
