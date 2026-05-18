import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import {
  formatWeeklyFitnessGoalsResolvedForDisplay,
  resolveWeeklyFitnessGoals,
  validateWeeklyFitnessGoalsInput,
  weeklyFitnessGoalsInputFromFieldTexts,
  type WeeklyFitnessGoalField,
  type WeeklyFitnessGoalsValidationError,
} from "@/lib/preferences/weeklyFitnessGoals";

export const WEEKLY_FITNESS_GOALS_EXPLAINER =
  "Set the weekly targets used on your Fitness card. These goals only change how progress is displayed — your health data stays unchanged.";

export type UseWeeklyFitnessGoalsEditorResult = {
  initializing: boolean;
  isSignedOut: boolean;
  saving: boolean;
  showSavingSpinner: boolean;
  showErrorBanner: boolean;
  errorMessage: string | null;
  fieldTexts: Record<WeeklyFitnessGoalField, string>;
  setFieldText: (field: WeeklyFitnessGoalField, text: string) => void;
  errorByField: Partial<Record<WeeklyFitnessGoalField, string>>;
  save: () => Promise<void>;
};

export function useWeeklyFitnessGoalsEditor(): UseWeeklyFitnessGoalsEditorResult {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const { state, setWeeklyFitnessGoals } = usePreferences();

  const resolved = useMemo(() => resolveWeeklyFitnessGoals(state.preferences), [state.preferences]);
  const displayDefaults = useMemo(
    () => formatWeeklyFitnessGoalsResolvedForDisplay(resolved),
    [resolved],
  );

  const [fieldTexts, setFieldTexts] = useState(displayDefaults);
  const [errors, setErrors] = useState<readonly WeeklyFitnessGoalsValidationError[]>([]);
  const [saving, setSaving] = useState(false);

  // Hydrate when persisted goals load or change (e.g. after auth refresh).
  useEffect(() => {
    setFieldTexts(displayDefaults);
  }, [
    displayDefaults.activityStepsPerDayGoal,
    displayDefaults.strengthWorkoutsPerWeekGoal,
    displayDefaults.cardioMilesPerWeekGoal,
    displayDefaults.sleepHoursPerNightGoal,
  ]);

  const errorByField = useMemo(() => {
    const m: Partial<Record<WeeklyFitnessGoalField, string>> = {};
    for (const e of errors) m[e.field] = e.message;
    return m;
  }, [errors]);

  const setFieldText = useCallback((field: WeeklyFitnessGoalField, text: string) => {
    setFieldTexts((prev) => ({ ...prev, [field]: text }));
  }, []);

  const save = useCallback(async () => {
    const candidate = weeklyFitnessGoalsInputFromFieldTexts(fieldTexts);
    const found = validateWeeklyFitnessGoalsInput(candidate);
    if (found.length > 0) {
      setErrors(found);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      const ok = await setWeeklyFitnessGoals(candidate);
      if (ok) {
        setFieldTexts(formatWeeklyFitnessGoalsResolvedForDisplay(candidate));
        router.back();
      }
    } finally {
      setSaving(false);
    }
  }, [fieldTexts, router, setWeeklyFitnessGoals]);

  const showErrorBanner = state.status === "error";
  const showSavingSpinner = saving || (state.status === "partial" && !initializing);
  const isSignedOut = !user && !initializing;

  return {
    initializing,
    isSignedOut,
    saving,
    showSavingSpinner,
    showErrorBanner,
    errorMessage: state.status === "error" ? state.message : null,
    fieldTexts,
    setFieldText,
    errorByField,
    save,
  };
}
