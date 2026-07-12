/**
 * Body Composition Goal section for /(app)/fitness-goals.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import type { BodyCompositionPrimaryMetric } from "@oli/contracts";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useBodyOverviewData } from "@/lib/data/body/useBodyOverviewData";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import {
  BODY_COMPOSITION_GOAL_EXPLAINER,
  BODY_COMPOSITION_METRIC_LABELS,
  buildBodyCompositionGoalDraft,
  formatCanonicalForDisplay,
  type BodyCompositionGoalLatestMeasurement,
} from "@/lib/preferences/bodyCompositionGoalEditor";
import { LB_PER_KG } from "@/lib/body/bodyCompositionShared";

export type UseBodyCompositionGoalEditorResult = {
  explainer: string;
  primaryMetric: BodyCompositionPrimaryMetric;
  setPrimaryMetric: (m: BodyCompositionPrimaryMetric) => void;
  metricLabels: typeof BODY_COMPOSITION_METRIC_LABELS;
  currentValueLabel: string;
  targetText: string;
  setTargetText: (t: string) => void;
  targetUnitSuffix: string;
  errorMessage: string | null;
  saving: boolean;
  hasExistingGoal: boolean;
  save: () => Promise<void>;
  clear: () => Promise<void>;
};

function latestForMetric(
  metric: BodyCompositionPrimaryMetric,
  overview: ReturnType<typeof useBodyOverviewData>["overview"],
): BodyCompositionGoalLatestMeasurement | null {
  const measuredAt = overview.latestObservedAtIso;
  if (measuredAt == null || measuredAt.length === 0) return null;

  if (metric === "weight") {
    if (overview.weightKg == null || !Number.isFinite(overview.weightKg)) return null;
    return { metric, valueCanonical: overview.weightKg, measuredAtIso: measuredAt };
  }
  if (metric === "bodyFat") {
    if (overview.bodyFatPercent == null || !Number.isFinite(overview.bodyFatPercent)) return null;
    return { metric, valueCanonical: overview.bodyFatPercent, measuredAtIso: measuredAt };
  }
  if (overview.leanBodyMassKg == null || !Number.isFinite(overview.leanBodyMassKg)) return null;
  return { metric, valueCanonical: overview.leanBodyMassKg, measuredAtIso: measuredAt };
}

export function useBodyCompositionGoalEditor(): UseBodyCompositionGoalEditorResult {
  const { user, initializing } = useAuth();
  const { state, setBodyCompositionGoal } = usePreferences();
  const body = useBodyOverviewData();
  const massUnit = state.preferences.units?.mass === "kg" ? "kg" : "lb";
  const existing = state.preferences.bodyCompositionGoal ?? null;

  const [primaryMetric, setPrimaryMetric] = useState<BodyCompositionPrimaryMetric>(
    existing?.primaryMetric ?? "weight",
  );
  const [targetText, setTargetText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing == null) return;
    setPrimaryMetric(existing.primaryMetric);
    if (existing.primaryMetric === "bodyFat") {
      setTargetText(String(existing.targetValue));
    } else if (massUnit === "lb") {
      setTargetText((existing.targetValue * LB_PER_KG).toFixed(1));
    } else {
      setTargetText(existing.targetValue.toFixed(1));
    }
  }, [existing?.updatedAt, existing?.primaryMetric, existing?.targetValue, massUnit]);

  const latest = useMemo(
    () => latestForMetric(primaryMetric, body.overview),
    [primaryMetric, body.overview],
  );

  const currentValueLabel = useMemo(() => {
    if (latest == null) return "No measurement";
    return formatCanonicalForDisplay({
      primaryMetric,
      valueCanonical: latest.valueCanonical,
      massDisplayUnit: massUnit,
    });
  }, [latest, primaryMetric, massUnit]);

  const targetUnitSuffix =
    primaryMetric === "bodyFat" ? "%" : massUnit === "lb" ? "lb" : "kg";

  const persistGoal = useCallback(
    async (confirmBaselineReset: boolean) => {
      const draft = buildBodyCompositionGoalDraft(
        {
          primaryMetric,
          targetDisplayText: targetText,
          massDisplayUnit: massUnit,
          latest,
          existingGoal: existing,
          nowIso: new Date().toISOString(),
        },
        { confirmBaselineReset },
      );
      if (!draft.ok) {
        setErrorMessage(draft.message);
        return;
      }
      if (draft.requiresConfirm) {
        const reason =
          draft.confirmReason === "primary_metric_change"
            ? "Changing the primary metric restarts progress from your latest measurement."
            : "Changing the target restarts progress from your latest measurement.";
        Alert.alert("Reset baseline?", reason, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            style: "destructive",
            onPress: () => {
              void persistGoal(true);
            },
          },
        ]);
        return;
      }

      setErrorMessage(null);
      setSaving(true);
      try {
        if (!user && !initializing) {
          setErrorMessage("Sign in to save your body composition goal.");
          return;
        }
        const ok = await setBodyCompositionGoal(draft.goal);
        if (!ok) {
          setErrorMessage(
            state.status === "error" ? state.message : "Could not save body composition goal.",
          );
        }
      } finally {
        setSaving(false);
      }
    },
    [
      primaryMetric,
      targetText,
      massUnit,
      latest,
      existing,
      user,
      initializing,
      setBodyCompositionGoal,
      state,
    ],
  );

  const save = useCallback(async () => {
    await persistGoal(false);
  }, [persistGoal]);

  const clear = useCallback(async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const ok = await setBodyCompositionGoal(null);
      if (!ok) {
        setErrorMessage(
          state.status === "error" ? state.message : "Could not clear body composition goal.",
        );
        return;
      }
      setTargetText("");
    } finally {
      setSaving(false);
    }
  }, [setBodyCompositionGoal, state]);

  return {
    explainer: BODY_COMPOSITION_GOAL_EXPLAINER,
    primaryMetric,
    setPrimaryMetric,
    metricLabels: BODY_COMPOSITION_METRIC_LABELS,
    currentValueLabel,
    targetText,
    setTargetText,
    targetUnitSuffix,
    errorMessage,
    saving,
    hasExistingGoal: existing != null,
    save,
    clear,
  };
}
