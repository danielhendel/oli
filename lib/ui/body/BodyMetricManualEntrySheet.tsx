import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { deleteIngestedRawEventAuthed } from "@/lib/api/ingest";
import { logBodyComposition, logWaist, logWeight } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import { inchesToCm } from "@/lib/body/waistProtocol";
import {
  MANUAL_ENTRY_SAVE_ERROR_MESSAGE,
  isValidManualBodyFatPercent,
  isValidManualLeanMassValue,
  isValidManualMeasuredAtIso,
  isValidManualWaistValue,
  isValidManualWeightValue,
  manualEntryValidationMessage,
  parseManualEntryDecimal,
  type BodyMetricManualEntryMetric,
  type WaistLengthDisplayUnit,
} from "@/lib/body/presentation/bodyMetricManualEntryValidation";
import {
  buildManualBodyFatPercentPayload,
  buildManualLeanBodyMassPayload,
  buildManualWaistCircumferencePayload,
} from "@/lib/events/manualBodyComposition";
import { buildManualWeightPayload } from "@/lib/events/manualWeight";
import {
  formatTimeOfDay,
  timeFieldsFromIso,
  timeFieldsFromWheel,
  timeOfDayToIsoOnDay,
  timeWheelFromFields,
  type TimeWheelSelection,
} from "@/lib/nutrition/editNutritionLog";
import { emitRefresh } from "@/lib/navigation/refreshBus";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { resolveUserProfileMainForInterpretation } from "@/lib/data/body/useBodyCompositionInterpretation";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { addDaysToDayKey } from "@/lib/data/body/bodyHistoryRange";
import { BodyMetricEntrySheetShell } from "@/lib/ui/body/BodyMetricEntrySheetShell";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { WaistHowToMeasureExpandable } from "@/lib/ui/body/WaistHowToMeasureExpandable";
import { NutritionTimeWheelPicker } from "@/lib/ui/nutrition/NutritionTimeWheelPicker";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import type { DayKey } from "@/lib/ui/calendar/types";

const LBS_PER_KG = 2.2046226218;

function getDeviceTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

function localDayKeyFromDate(d: Date): DayKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}` as DayKey;
}

function formatDayKeyLabel(dayKey: string): string {
  const parts = dayKey.split("-").map(Number);
  const d = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
    placeholderIn: string;
    placeholderCm: string;
  }
> = {
  weight: {
    title: "Log Weight",
    fieldLabel: "Weight",
    accessibilityLabel: "Weight",
    placeholderLb: "e.g. 185.2",
    placeholderKg: "e.g. 84.0",
    placeholderPercent: "",
    placeholderIn: "",
    placeholderCm: "",
  },
  bodyFat: {
    title: "Log Body Fat",
    fieldLabel: "Body Fat",
    accessibilityLabel: "Body Fat percentage",
    placeholderLb: "",
    placeholderKg: "",
    placeholderPercent: "e.g. 18.5",
    placeholderIn: "",
    placeholderCm: "",
  },
  leanMass: {
    title: "Log Lean Mass",
    fieldLabel: "Lean Mass",
    accessibilityLabel: "Lean Mass",
    placeholderLb: "e.g. 135.0",
    placeholderKg: "e.g. 61.2",
    placeholderPercent: "",
    placeholderIn: "",
    placeholderCm: "",
  },
  waist: {
    title: "Log Waist",
    fieldLabel: "Waist",
    accessibilityLabel: "Waist circumference",
    placeholderLb: "",
    placeholderKg: "",
    placeholderPercent: "",
    placeholderIn: "e.g. 32.5",
    placeholderCm: "e.g. 82.5",
  },
};

export type BodyMetricManualEntrySheetProps = {
  visible: boolean;
  metric: BodyMetricManualEntryMetric | null;
  onClose: () => void;
  onSaved: (metric: BodyMetricManualEntryMetric) => void;
  /**
   * Edit target for waist corrections (create-new + delete previous).
   * When set, measuredAt defaults to the existing observation time.
   */
  editTarget?: {
    rawEventId: string;
    observedAtIso: string;
    waistCm: number;
  } | null;
  /** Optional length-unit override (defaults to profile preferred length). */
  lengthUnitDefault?: WaistLengthDisplayUnit;
};

/**
 * Metric-specific manual measurement sheet for Body Composition landing cards.
 * Weight → weight kind; Body Fat / Lean Mass / Waist → body_composition kind.
 */
export function BodyMetricManualEntrySheet(props: BodyMetricManualEntrySheetProps) {
  const metric = props.metric;
  const visible = props.visible && metric != null;
  const { user, initializing, getIdToken } = useAuth();
  const { state: prefState } = usePreferences();
  const { state: profileState } = useUserProfileMain();
  const profileLength = useMemo(() => {
    const profile = resolveUserProfileMainForInterpretation(profileState);
    return profile.app.preferredUnits.length === "in" ? ("in" as const) : ("cm" as const);
  }, [profileState]);
  const inputRef = useRef<TextInput>(null);
  const prevVisibleRef = useRef(visible);

  const [unit, setUnit] = useState<"lb" | "kg">("lb");
  const [lengthUnit, setLengthUnit] = useState<WaistLengthDisplayUnit>("cm");
  const [unitTouched, setUnitTouched] = useState(false);
  const [valueText, setValueText] = useState("");
  const [measuredDayKey, setMeasuredDayKey] = useState<DayKey>(getTodayDayKey() as DayKey);
  const [timeWheel, setTimeWheel] = useState<TimeWheelSelection>(() => {
    const now = new Date();
    return timeWheelFromFields(now.getHours(), now.getMinutes());
  });
  const [timePickerOpen, setTimePickerOpen] = useState(false);
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
    if (!unitTouched) {
      setLengthUnit(props.lengthUnitDefault ?? profileLength);
    }
  }, [profileLength, props.lengthUnitDefault, unitTouched]);

  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;
    if (wasVisible && !visible) {
      setValueText("");
      setUnitTouched(false);
      setStatus({ state: "idle" });
      setTimePickerOpen(false);
      return;
    }
    if (visible && !wasVisible) {
      setValueText("");
      setStatus({ state: "idle" });
      setTimePickerOpen(false);
      const edit = props.editTarget;
      if (metric === "waist" && edit != null) {
        const { hours24, minutes } = timeFieldsFromIso(edit.observedAtIso);
        setTimeWheel(timeWheelFromFields(hours24, minutes));
        const d = new Date(edit.observedAtIso);
        setMeasuredDayKey(
          Number.isNaN(d.getTime()) ? (getTodayDayKey() as DayKey) : localDayKeyFromDate(d),
        );
        const display =
          (props.lengthUnitDefault ?? profileLength) === "in"
            ? edit.waistCm / 2.54
            : edit.waistCm;
        setValueText(display.toFixed(1).replace(/\.0$/, ""));
      } else {
        const now = new Date();
        setMeasuredDayKey(localDayKeyFromDate(now));
        setTimeWheel(timeWheelFromFields(now.getHours(), now.getMinutes()));
      }
    }
  }, [visible, metric, props.editTarget, props.lengthUnitDefault, profileLength]);

  const focusField = () => {
    inputRef.current?.focus();
  };

  const copy = metric != null ? METRIC_COPY[metric] : null;

  const measuredAtIso = useMemo(() => {
    const { hours24, minutes } = timeFieldsFromWheel(timeWheel);
    return timeOfDayToIsoOnDay(measuredDayKey, hours24, minutes);
  }, [measuredDayKey, timeWheel]);

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
    if (metric === "waist") {
      return { ok: isValidManualWaistValue(value), value };
    }
    return { ok: isValidManualLeanMassValue(value), value };
  }, [metric, valueText]);

  const measuredAtOk = metric !== "waist" || isValidManualMeasuredAtIso(measuredAtIso);

  const canSave =
    !initializing &&
    Boolean(user) &&
    metric != null &&
    parsed.ok &&
    parsed.value != null &&
    measuredAtOk &&
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
      const time = metric === "waist" ? measuredAtIso : new Date().toISOString();
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
      } else if (metric === "waist") {
        const waistCm = lengthUnit === "cm" ? parsed.value : inchesToCm(parsed.value);
        const payload = buildManualWaistCircumferencePayload({
          time,
          timezone,
          waistCircumferenceCm: waistCm,
        });
        if (props.editTarget != null) {
          const created = await logWaist(payload, token);
          if (!created.ok) {
            setStatus({ state: "error", message: MANUAL_ENTRY_SAVE_ERROR_MESSAGE });
            return;
          }
          const deleted = await deleteIngestedRawEventAuthed(props.editTarget.rawEventId, token);
          if (!deleted.ok) {
            setStatus({ state: "error", message: MANUAL_ENTRY_SAVE_ERROR_MESSAGE });
            return;
          }
        } else {
          const res = await logWaist(payload, token);
          if (!res.ok) {
            setStatus({ state: "error", message: MANUAL_ENTRY_SAVE_ERROR_MESSAGE });
            return;
          }
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
  const usesLengthUnit = metric === "waist";
  const placeholder = usesMassUnit
    ? unit === "lb"
      ? copy.placeholderLb
      : copy.placeholderKg
    : usesLengthUnit
      ? lengthUnit === "in"
        ? copy.placeholderIn
        : copy.placeholderCm
      : copy.placeholderPercent;

  const errorMessage =
    status.state === "error"
      ? status.message
      : valueText.trim().length > 0 && !parsed.ok
        ? manualEntryValidationMessage(metric)
        : metric === "waist" && !measuredAtOk
          ? "Enter a valid measurement date and time."
          : null;

  const unitA11y =
    unit === "lb" ? "Weight unit, pounds selected" : "Weight unit, kilograms selected";
  const lengthA11y =
    lengthUnit === "in" ? "Length unit, inches selected" : "Length unit, centimeters selected";
  const timeLabel = formatTimeOfDay(
    timeFieldsFromWheel(timeWheel).hours24,
    timeFieldsFromWheel(timeWheel).minutes,
  );

  return (
    <BodyMetricEntrySheetShell
      visible
      title={props.editTarget != null && metric === "waist" ? "Edit Waist" : copy.title}
      onClose={props.onClose}
      onSave={() => void onSave()}
      canSave={canSave}
      saving={status.state === "saving"}
      errorMessage={errorMessage}
      testID={`body-metric-manual-entry-${metric}`}
      onPresented={focusField}
    >
      {metric === "waist" ? (
        <WaistHowToMeasureExpandable testID="body-metric-manual-entry-how-to-measure" />
      ) : null}
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
          accessibilityHint={
            errorMessage != null ? errorMessage : undefined
          }
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
        ) : usesLengthUnit ? (
          <View
            style={styles.unitGroup}
            accessibilityRole="radiogroup"
            accessibilityLabel="Waist length unit"
          >
            <Pressable
              onPress={() => {
                setUnitTouched(true);
                setLengthUnit("in");
              }}
              style={[styles.unitBtn, lengthUnit === "in" && styles.unitActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: lengthUnit === "in" }}
              accessibilityLabel={lengthUnit === "in" ? lengthA11y : "Inches"}
              testID="body-metric-manual-entry-unit-in-waist"
            >
              <Text style={[styles.unitText, lengthUnit === "in" && styles.unitTextActive]}>
                in
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setUnitTouched(true);
                setLengthUnit("cm");
              }}
              style={[styles.unitBtn, lengthUnit === "cm" && styles.unitActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: lengthUnit === "cm" }}
              accessibilityLabel={
                lengthUnit === "cm" ? lengthA11y : "Centimeters"
              }
              testID="body-metric-manual-entry-unit-cm-waist"
            >
              <Text style={[styles.unitText, lengthUnit === "cm" && styles.unitTextActive]}>
                cm
              </Text>
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

      {metric === "waist" ? (
        <View style={styles.measuredAtBlock} testID="body-metric-manual-entry-measured-at">
          <Text style={styles.fieldLabel}>Measured at</Text>
          <View style={styles.dayRow}>
            <Pressable
              onPress={() =>
                setMeasuredDayKey(addDaysToDayKey(measuredDayKey, -1) as DayKey)
              }
              style={styles.dayStepBtn}
              accessibilityRole="button"
              accessibilityLabel="Previous day"
              testID="body-metric-manual-entry-day-prev"
            >
              <Text style={styles.dayStepText}>−</Text>
            </Pressable>
            <Text
              style={styles.dayLabel}
              accessibilityLabel={`Measurement date ${formatDayKeyLabel(measuredDayKey)}`}
              testID="body-metric-manual-entry-day-label"
            >
              {formatDayKeyLabel(measuredDayKey)}
            </Text>
            <Pressable
              onPress={() =>
                setMeasuredDayKey(addDaysToDayKey(measuredDayKey, 1) as DayKey)
              }
              style={styles.dayStepBtn}
              accessibilityRole="button"
              accessibilityLabel="Next day"
              testID="body-metric-manual-entry-day-next"
            >
              <Text style={styles.dayStepText}>+</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => setTimePickerOpen((open) => !open)}
            style={styles.timeButton}
            accessibilityRole="button"
            accessibilityLabel={`Measurement time ${timeLabel}. Opens time picker.`}
            testID="body-metric-manual-entry-time-button"
          >
            <Text style={styles.timeButtonText}>{timeLabel}</Text>
          </Pressable>
          {timePickerOpen ? (
            <View testID="body-metric-manual-entry-time-picker">
              <NutritionTimeWheelPicker value={timeWheel} onChange={setTimeWheel} />
            </View>
          ) : null}
        </View>
      ) : null}
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
  measuredAtBlock: {
    gap: 8,
    marginTop: 4,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayStepBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  dayStepText: {
    color: UI_TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "700",
  },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    color: UI_TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "600",
  },
  timeButton: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  timeButtonText: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
});
