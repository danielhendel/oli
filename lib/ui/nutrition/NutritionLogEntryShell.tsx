import React, { useCallback, useRef, useState } from "react";
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DayKey } from "@/lib/ui/calendar/types";
import { buildNutritionMacroSummaryBarModel } from "@/lib/data/nutrition/buildNutritionMacroSummaryBarModel";
import { NUTRITION_LOGGING_FIELD_ORDER, type UseNutritionLoggingScreenStateResult } from "@/lib/hooks/useNutritionLoggingScreenState";
import { useNutritionQuickAddForm } from "@/lib/hooks/useNutritionQuickAddForm";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { NutritionQuickAddCard } from "@/lib/ui/nutrition/NutritionQuickAddCard";
import { NutritionMacroSummaryBar } from "@/lib/ui/nutrition/NutritionMacroSummaryBar";
import { NutritionLoggingSubmitBar } from "@/lib/ui/nutrition/NutritionLoggingSubmitBar";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

import { UI_SCREEN_BG } from "@/lib/ui/theme/uiTokens";
const ACCESSORY_ID = "nutritionLogKeyboardAccessoryV2";

export type NutritionLogEntryShellProps = {
  state: UseNutritionLoggingScreenStateResult;
  onLogged: (dayKey: DayKey) => void;
};

/**
 * Standalone Quick Add: macro fields + optional fiber + save bar only (no library hub UI).
 */
export function NutritionLogEntryShell({ state, onLogged }: NutritionLogEntryShellProps) {
  const insets = useSafeAreaInsets();
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const quickVm = useNutritionQuickAddForm(state.draft, state.displayedFieldErrors);
  const summaryModel = buildNutritionMacroSummaryBarModel(state.draft);

  const setRef = useCallback((index: number) => (el: TextInput | null) => {
    inputRefs.current[index] = el;
  }, []);

  const focusIndex = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
  }, []);

  const onAccessoryPrev = useCallback(() => {
    if (focusedIndex == null) return;
    const next = focusedIndex - 1;
    if (next >= 0) focusIndex(next);
  }, [focusedIndex, focusIndex]);

  const onAccessoryNext = useCallback(() => {
    if (focusedIndex == null) return;
    const next = focusedIndex + 1;
    if (next < NUTRITION_LOGGING_FIELD_ORDER.length) focusIndex(next);
    else Keyboard.dismiss();
  }, [focusedIndex, focusIndex]);

  const onSave = useCallback(async () => {
    const r = await state.save();
    if (r.ok) onLogged(r.dayKey);
  }, [state, onLogged]);

  const onRetry = useCallback(async () => {
    const r = await state.retrySave();
    if (r.ok) onLogged(r.dayKey);
  }, [state, onLogged]);

  const accessoryId = ACCESSORY_ID;

  return (
    <ModuleScreenShell title="" hideTitleChrome bodyScrollEnabled={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        {Platform.OS === "ios" ? (
          <InputAccessoryView nativeID={ACCESSORY_ID}>
            <View style={styles.accessory}>
              <Pressable
                onPress={onAccessoryPrev}
                style={({ pressed }) => [styles.accessoryBtn, pressed && styles.accessoryPressed]}
                accessibilityRole="button"
                accessibilityLabel="Previous field"
                hitSlop={8}
              >
                <Text style={styles.accessoryBtnText}>Previous</Text>
              </Pressable>
              <Pressable
                onPress={onAccessoryNext}
                style={({ pressed }) => [styles.accessoryBtn, pressed && styles.accessoryPressed]}
                accessibilityRole="button"
                accessibilityLabel="Next field"
                hitSlop={8}
              >
                <Text style={styles.accessoryBtnText}>Next</Text>
              </Pressable>
              <Pressable
                onPress={() => Keyboard.dismiss()}
                style={({ pressed }) => [styles.accessoryPrimary, pressed && styles.accessoryPressed]}
                accessibilityRole="button"
                accessibilityLabel="Dismiss keyboard"
                hitSlop={8}
              >
                <Text style={styles.accessoryPrimaryText}>Done</Text>
              </Pressable>
            </View>
          </InputAccessoryView>
        ) : null}

        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 200 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <NutritionQuickAddCard
            quickVm={quickVm}
            onChangeField={state.onChangeDraftField}
            onBlurField={state.onBlurDraftField}
            setFocusedIndex={setFocusedIndex}
            setRef={setRef}
            inputAccessoryViewID={accessoryId}
          />

          {state.errorMessage != null ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Text style={styles.errorTitle}>Could not save</Text>
              <Text style={styles.errorBody}>{state.errorMessage}</Text>
              {__DEV__ && state.requestId != null ? (
                <Text style={styles.rid}>Request ID: {state.requestId}</Text>
              ) : null}
              <View style={styles.errorRow}>
                <Pressable
                  onPress={() => void onRetry()}
                  style={({ pressed }) => [styles.linkBtn, styles.linkPrimary, pressed && styles.accessoryPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Try saving again"
                >
                  <Text style={styles.linkPrimaryText}>Try again</Text>
                </Pressable>
                <Pressable
                  onPress={state.dismissError}
                  style={({ pressed }) => [styles.linkBtn, pressed && styles.accessoryPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss error"
                >
                  <Text style={styles.linkText}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <NutritionMacroSummaryBar model={summaryModel} />
          <NutritionLoggingSubmitBar
            canSubmit={state.canSubmit}
            status={state.status}
            onSave={() => void onSave()}
          />
        </View>
      </KeyboardAvoidingView>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8, gap: 20 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: UI_SCREEN_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(60, 60, 67, 0.18)",
  },
  accessory: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#E5E5EA",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(60, 60, 67, 0.29)",
  },
  accessoryBtn: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center" },
  accessoryPrimary: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center" },
  accessoryBtnText: { fontSize: 17, fontWeight: "400", color: SYSTEM_ACCENT },
  accessoryPrimaryText: { fontSize: 17, fontWeight: "600", color: SYSTEM_ACCENT },
  accessoryPressed: { opacity: 0.65 },
  errorBox: {
    backgroundColor: "rgba(255, 59, 48, 0.08)",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  errorTitle: { fontSize: 17, fontWeight: "700", color: "#C62828" },
  errorBody: { fontSize: 15, lineHeight: 22, color: "#1C1C1E" },
  rid: { fontSize: 12, color: "#8E8E93", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  errorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  linkBtn: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: "center" },
  linkPrimary: { backgroundColor: "rgba(0, 122, 255, 0.12)", borderRadius: 10 },
  linkText: { fontSize: 16, fontWeight: "600", color: SYSTEM_ACCENT },
  linkPrimaryText: { fontSize: 16, fontWeight: "700", color: SYSTEM_ACCENT },
});
