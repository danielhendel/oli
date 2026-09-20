import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { logBodyComposition, logWeight } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  MANUAL_ENTRY_SAVE_ERROR_MESSAGE,
  isValidManualBodyFatPercent,
  isValidManualLeanMassValue,
  isValidManualWeightValue,
  manualEntryValidationMessage,
  parseManualEntryDecimal,
  type BodyMetricManualEntryMetric,
} from "@/lib/body/presentation/bodyMetricManualEntryValidation";
import {
  buildManualBodyFatPercentPayload,
  buildManualLeanBodyMassPayload,
} from "@/lib/events/manualBodyComposition";
import { buildManualWeightPayload } from "@/lib/events/manualWeight";
import { emitRefresh } from "@/lib/navigation/refreshBus";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { BodyMetricEntrySheetShell } from "@/lib/ui/body/BodyMetricEntrySheetShell";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
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

const METRIC_COPY: Record<
  BodyMetricManualEntryMetric,
  {
    title: string;
    fieldLabel: string;
    accessibilityLabel: string;
    placeholderLb: string;
    placeholderKg: string;
    placeholderPercent: string;
  }
> = {
  weight: {
    title: "Log Weight",
    fieldLabel: "Weight",
    accessibilityLabel: "Weight",
    placeholderLb: "e.g. 185.2",
    placeholderKg: "e.g. 84.0",
    placeholderPercent: "",
  },
  bodyFat: {
    title: "Log Body Fat",
    fieldLabel: "Body Fat",
    accessibilityLabel: "Body Fat percentage",
    placeholderLb: "",
    placeholderKg: "",
    placeholderPercent: "e.g. 18.5",
  },
  leanMass: {
    title: "Log Lean Mass",
    fieldLabel: "Lean Mass",
    accessibilityLabel: "Lean Mass",
    placeholderLb: "e.g. 135.0",
    placeholderKg: "e.g. 61.2",
    placeholderPercent: "",
  },
};

export type BodyMetricManualEntrySheetProps = {
  visible: boolean;
  metric: BodyMetricManualEntryMetric | null;
  onClose: () => void;
  onSaved: (metric: BodyMetricManualEntryMetric) => void;
};

/**
 * Metric-specific manual measurement sheet for Body Composition landing cards.
 * Weight → weight kind; Body Fat / Lean Mass → body_composition kind (one metric each).
 */
export function BodyMetricManualEntrySheet(props: BodyMetricManualEntrySheetProps) {
  const metric = props.metric;
  const visible = props.visible && metric != null;
  const { user, initializing, getIdToken } = useAuth();
  const { state: prefState } = usePreferences();
  const inputRef = useRef<TextInput>(null);
  const prevVisibleRef = useRef(visible);

  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [unitTouched, setUnitTouched] = useState(false);
  const [valueText, setValueText] = useState("");
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
      setValueText("");
      setUnitTouched(false);
      setStatus({ state: "idle" });
      return;
    }
    if (visible && !wasVisible) {
      setValueText("");
      setStatus({ state: "idle" });
    }
  }, [visible]);

  const focusField = () => {
    inputRef.current?.focus();
  };

  const copy = metric != null ? METRIC_COPY[metric] : null;

  const parsed = useMemo(() => {
    if (metric == null) {
      return { ok: false as const, value: null as number | null };
    }
    const value = parseManualEntryDecimal(valueText);
    if (value == null) return { ok: false as const, value: null };
    if (metric === "weight") {
      return { ok: isValidManualWeightValue(value), value };
    }
    if (metric === "bodyFat") {
      return { ok: isValidManualBodyFatPercent(value), value };
    }
    return { ok: isValidManualLeanMassValue(value), value };
  }, [metric, valueText]);

  const canSave =
    !initializing &&
    Boolean(user) &&
    metric != null &&
    parsed.ok &&
    parsed.value != null &&
    status.state !== "saving";

  const onSave = async () => {
    if (!canSave || metric == null || parsed.value == null) return;
    setStatus({ state: "saving" });
    try {
      const token = await getIdToken(false);
      if (!token) {
        setStatus({ state: "error", message: MANUAL_ENTRY_SAVE_ERROR_MESSAGE });
        return;
      }
      const time = new Date().toISOString();
      const timezone = getDeviceTimeZone();

      if (metric === "weight") {
        const weightLbs = unit === "lb" ? parsed.value : parsed.value * LBS_PER_KG;
        const weightKg = unit === "kg" ? parsed.value : parsed.value / LBS_PER_KG;
        const payload = buildManualWeightPayload({ time, timezone, weightLbs });
        const res = await logWeight(payload, token);
        if (!res.ok) {
          setStatus({ state: "error", message: MANUAL_ENTRY_SAVE_ERROR_MESSAGE });
          return;
        }
        emitRefresh("commandCenter", `${Date.now()}`, { optimisticWeightKg: weightKg });
      } else if (metric === "bodyFat") {
        const payload = buildManualBodyFatPercentPayload({
          time,
          timezone,
          bodyFatPercent: parsed.value,
        });
        const res = await logBodyComposition(payload, "bodyFatPercent", token);
        if (!res.ok) {
          setStatus({ state: "error", message: MANUAL_ENTRY_SAVE_ERROR_MESSAGE });
          return;
        }
        emitRefresh("commandCenter", `${Date.now()}`);
      } else {
        const leanLbs = unit === "lb" ? parsed.value : parsed.value * LBS_PER_KG;
        const payload = buildManualLeanBodyMassPayload({
          time,
          timezone,
          leanBodyMassLbs: leanLbs,
        });
        const res = await logBodyComposition(payload, "leanBodyMassKg", token);
        if (!res.ok) {
          setStatus({ state: "error", message: MANUAL_ENTRY_SAVE_ERROR_MESSAGE });
          return;
        }
        emitRefresh("commandCenter", `${Date.now()}`);
      }

      props.onSaved(metric);
      props.onClose();
    } catch {
      setStatus({ state: "error", message: MANUAL_ENTRY_SAVE_ERROR_MESSAGE });
    }
  };

  if (!visible || metric == null || copy == null) return null;

  const usesMassUnit = metric === "weight" || metric === "leanMass";
  const placeholder = usesMassUnit
    ? unit === "lb"
      ? copy.placeholderLb
      : copy.placeholderKg
    : copy.placeholderPercent;

  const errorMessage =
    status.state === "error"
      ? status.message
      : valueText.trim().length > 0 && !parsed.ok
        ? manualEntryValidationMessage(metric)
        : null;

  const unitA11y =
    unit === "lb" ? "Weight unit, pounds selected" : "Weight unit, kilograms selected";

  return (
    <BodyMetricEntrySheetShell
      visible
      title={copy.title}
      onClose={props.onClose}
      onSave={() => void onSave()}
      canSave={canSave}
      saving={status.state === "saving"}
      errorMessage={errorMessage}
      testID={`body-metric-manual-entry-${metric}`}
      onPresented={focusField}
    >
      <Text style={styles.fieldLabel}>{copy.fieldLabel}</Text>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          value={valueText}
          onChangeText={(text) => {
            setValueText(text);
            if (status.state === "error") setStatus({ state: "idle" });
          }}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={UI_TEXT_MUTED}
          style={styles.input}
          accessibilityLabel={copy.accessibilityLabel}
          testID={`body-metric-manual-entry-input-${metric}`}
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={() => {
            Keyboard.dismiss();
          }}
        />
        {usesMassUnit ? (
          <View
            style={styles.unitGroup}
            accessibilityRole="radiogroup"
            accessibilityLabel={metric === "weight" ? "Weight unit" : "Lean Mass unit"}
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
              testID={`body-metric-manual-entry-unit-lb-${metric}`}
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
              testID={`body-metric-manual-entry-unit-kg-${metric}`}
            >
              <Text style={[styles.unitText, unit === "kg" && styles.unitTextActive]}>kg</Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={styles.percentAffordance}
            accessible
            accessibilityLabel="Percent"
            testID="body-metric-manual-entry-unit-percent"
          >
            <Text style={styles.percentText}>%</Text>
          </View>
        )}
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
  percentAffordance: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
  },
  percentText: {
    fontSize: 15,
    fontWeight: "700",
    color: UI_TEXT_SECONDARY,
  },
});
