// lib/ui/WeightLogModal.tsx — Manual weight entry / edit (weight-only).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { logWeight } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  MANUAL_ENTRY_SAVE_ERROR_MESSAGE,
  isValidManualWeightValue,
  manualEntryValidationMessage,
  parseManualEntryDecimal,
} from "@/lib/body/presentation/bodyMetricManualEntryValidation";
import { buildManualWeightPayload } from "@/lib/events/manualWeight";
import { useBodyWeightLogMutations } from "@/lib/hooks/useBodyWeightLogMutations";
import { emitRefresh } from "@/lib/navigation/refreshBus";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { BodyMetricEntrySheetShell } from "@/lib/ui/body/BodyMetricEntrySheetShell";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

const LBS_PER_KG = 2.2046226218;

function getDeviceTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

export type WeightLogModalEditTarget = {
  rawEventId: string;
  observedAtIso: string;
  weightKg: number;
  /** Retained for caller compatibility; Body Fat is not edited on this sheet. */
  bodyFatPercent: number | null;
  isImported?: boolean;
  importedSourceLabel?: string;
};

export type WeightLogModalProps = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  editTarget?: WeightLogModalEditTarget | null;
};

/**
 * Weight-only manual entry / correction sheet.
 * Body Fat and Lean Mass use {@link BodyMetricManualEntrySheet} from their cards.
 */
export function WeightLogModal({
  visible,
  onClose,
  onSaved,
  editTarget = null,
}: WeightLogModalProps) {
  const { user, initializing, getIdToken } = useAuth();
  const { updateEntry, reset: resetMutations } = useBodyWeightLogMutations();
  const { state: prefState } = usePreferences();
  const prevVisibleRef = useRef(visible);
  const inputRef = useRef<TextInput>(null);
  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [unitTouched, setUnitTouched] = useState(false);
  const [weightText, setWeightText] = useState("");
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "saving" }
    | { state: "error"; message: string }
  >({ state: "idle" });

  useEffect(() => {
    if (!unitTouched && prefState.preferences?.units?.mass) {
      setUnit(prefState.preferences.units.mass);
    }
  }, [prefState.preferences?.units?.mass, unitTouched]);

  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (wasVisible && !visible) {
      setWeightText("");
      setStatus((current) => (current.state === "idle" ? current : { state: "idle" }));
      resetMutations();
      return;
    }

    if (!visible) return;

    if (editTarget) {
      const massUnit = prefState.preferences?.units?.mass ?? unit;
      const display = massUnit === "lb" ? editTarget.weightKg * LBS_PER_KG : editTarget.weightKg;
      setWeightText(display.toFixed(1).replace(/\.0$/, ""));
    } else if (!wasVisible) {
      setWeightText("");
    }
    return undefined;
  }, [visible, editTarget, prefState.preferences?.units?.mass, unit, resetMutations]);

  const focusField = () => {
    if (!editTarget) {
      inputRef.current?.focus();
    }
  };

  const parsed = useMemo(() => {
    const w = parseManualEntryDecimal(weightText);
    const weightOk = w != null && isValidManualWeightValue(w);
    const weightLbs = weightOk && w != null ? (unit === "lb" ? w : w * LBS_PER_KG) : null;
    const weightKg = weightOk && w != null ? (unit === "kg" ? w : w / LBS_PER_KG) : null;
    return { weightOk, weightLbs, weightKg };
  }, [weightText, unit]);

  const canSave =
    !initializing &&
    Boolean(user) &&
    parsed.weightOk &&
    parsed.weightLbs != null &&
    parsed.weightKg != null &&
    status.state !== "saving";

  const onSave = async () => {
    if (!canSave || parsed.weightLbs == null || parsed.weightKg == null) return;
    setStatus({ state: "saving" });
    try {
      const token = await getIdToken(false);
      if (!token) {
        setStatus({ state: "error", message: MANUAL_ENTRY_SAVE_ERROR_MESSAGE });
        return;
      }
      const time = editTarget?.observedAtIso ?? new Date().toISOString();
      const timezone = getDeviceTimeZone();
      if (editTarget) {
        const res = await updateEntry({
          rawEventId: editTarget.rawEventId,
          observedAtIso: time,
          weightLbs: parsed.weightLbs,
          timezone,
        });
        if (!res.ok) {
          setStatus({ state: "error", message: MANUAL_ENTRY_SAVE_ERROR_MESSAGE });
          return;
        }
      } else {
        const payload = buildManualWeightPayload({
          time,
          timezone,
          weightLbs: parsed.weightLbs,
        });
        const res = await logWeight(payload, token);
        if (!res.ok) {
          setStatus({ state: "error", message: MANUAL_ENTRY_SAVE_ERROR_MESSAGE });
          return;
        }
        emitRefresh("commandCenter", `${Date.now()}`, { optimisticWeightKg: parsed.weightKg });
      }
      onSaved();
      onClose();
    } catch {
      setStatus({ state: "error", message: MANUAL_ENTRY_SAVE_ERROR_MESSAGE });
    }
  };

  if (!visible) return null;

  const unitA11y =
    unit === "lb" ? "Weight unit, pounds selected" : "Weight unit, kilograms selected";
  const errorMessage =
    status.state === "error"
      ? status.message
      : weightText.trim().length > 0 && !parsed.weightOk
        ? manualEntryValidationMessage("weight")
        : null;

  const helpText = editTarget?.isImported
    ? `Editing creates an Oli correction and does not modify ${
        editTarget.importedSourceLabel ?? "the original source"
      }.`
    : null;

  return (
    <BodyMetricEntrySheetShell
      visible={visible}
      title={editTarget ? "Edit weight" : "Log Weight"}
      onClose={onClose}
      onSave={() => void onSave()}
      canSave={canSave}
      saving={status.state === "saving"}
      primaryLabel={editTarget ? "Save changes" : "Save measurement"}
      errorMessage={errorMessage}
      helpText={helpText}
      testID="weight-log-modal"
      onPresented={focusField}
    >
      <Text style={styles.fieldLabel}>Weight</Text>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          value={weightText}
          onChangeText={(text) => {
            setWeightText(text);
            if (status.state === "error") setStatus({ state: "idle" });
          }}
          keyboardType="decimal-pad"
          placeholder={unit === "lb" ? "e.g. 185.2" : "e.g. 84.0"}
          placeholderTextColor={UI_TEXT_MUTED}
          style={styles.input}
          accessibilityLabel="Weight"
          testID="weight-log-modal-input"
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={() => {
            Keyboard.dismiss();
          }}
        />
        <View
          style={styles.unitGroup}
          accessibilityRole="radiogroup"
          accessibilityLabel="Weight unit"
        >
          <Pressable
            onPress={() => {
              setUnitTouched(true);
              setUnit("lb");
            }}
            style={[styles.unitBtn, unit === "lb" && styles.unitActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: unit === "lb" }}
            accessibilityLabel={unit === "lb" ? unitA11y : "Pounds"}
            testID="weight-log-modal-unit-lb"
          >
            <Text style={[styles.unitText, unit === "lb" && styles.unitTextActive]}>lb</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setUnitTouched(true);
              setUnit("kg");
            }}
            style={[styles.unitBtn, unit === "kg" && styles.unitActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: unit === "kg" }}
            accessibilityLabel={
              unit === "kg" ? "Weight unit, kilograms selected" : "Kilograms"
            }
            testID="weight-log-modal-unit-kg"
          >
            <Text style={[styles.unitText, unit === "kg" && styles.unitTextActive]}>kg</Text>
          </Pressable>
        </View>
      </View>
    </BodyMetricEntrySheetShell>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  unitGroup: {
    flexDirection: "row",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  unitBtn: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  unitActive: {
    backgroundColor: BODY_INDIGO,
  },
  unitText: {
    fontSize: 14,
    fontWeight: "700",
    color: UI_TEXT_SECONDARY,
  },
  unitTextActive: {
    color: "#FFFFFF",
  },
});
