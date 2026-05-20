import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { useWorkoutOverrides } from "@/lib/data/workouts/workoutOverrides";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getRawEvent, logWorkoutTitleOverride } from "@/lib/api/usersMe";
import { devVerifyWorkoutTitleOverridePersisted } from "@/lib/debug/workoutTitleOverrideDurability";
import { invalidateWorkoutCalendarHydrate } from "@/lib/data/workouts/workoutCalendarHydrateInvalidate";
import { exitLiveWorkoutLogToOverview } from "@/lib/workouts/navigation/exitWorkoutLogFlow";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_SCREEN_BG,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

type RenameScreenMode = "rename" | "finish";

function parseMode(raw: string | string[] | undefined): RenameScreenMode {
  if (raw === "finish") return "finish";
  return "rename";
}

export default function EditWorkoutRenameScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { getIdToken } = useAuth();

  const params = useLocalSearchParams<{
    mode?: string;
    workoutId?: string;
    currentTitle?: string;
    titleAnchorObservedAt?: string;
  }>();
  const mode = parseMode(params.mode);
  const isFinishMode = mode === "finish";
  const workoutId = typeof params.workoutId === "string" ? params.workoutId : "";
  const currentTitle = typeof params.currentTitle === "string" ? params.currentTitle : "Workout";
  const titleAnchorObservedAt =
    typeof params.titleAnchorObservedAt === "string" && params.titleAnchorObservedAt.trim().length > 0
      ? params.titleAnchorObservedAt.trim()
      : null;
  const [nextTitle, setNextTitle] = useState(isFinishMode ? "" : currentTitle);
  const [saving, setSaving] = useState(false);
  const { saveOverride } = useWorkoutOverrides(useMemo(() => (workoutId ? [workoutId] : []), [workoutId]));

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("task"),
      title: isFinishMode ? "Name Workout" : "Rename Workout",
      headerLeft: () => (
        <HeaderBackButton
          onPress={() => {
            if (isFinishMode) {
              exitLiveWorkoutLogToOverview(router);
              return;
            }
            navigation.goBack();
          }}
        />
      ),
    });
  }, [navigation, isFinishMode, router]);

  const exitAfterSave = () => {
    if (isFinishMode) {
      exitLiveWorkoutLogToOverview(router);
      return;
    }
    router.back();
  };

  const onCancel = () => {
    if (isFinishMode) {
      exitLiveWorkoutLogToOverview(router);
      return;
    }
    router.back();
  };

  if (!workoutId) {
    return (
      <ScreenContainer>
        <View style={styles.root}>
          <Text style={styles.title}>{isFinishMode ? "Name workout" : "Rename workout"}</Text>
          <Text style={styles.description}>Missing workout id.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.root}>
        <Text style={styles.title}>{isFinishMode ? "Name workout" : "Rename workout"}</Text>
        <Text style={styles.description}>
          {isFinishMode
            ? "Give this workout a name so you can find it easily in Strength."
            : "Change the displayed workout name while keeping source data intact."}
        </Text>
        <View style={styles.card}>
          {!isFinishMode ? (
            <>
              <Text style={styles.sectionLabel}>Current</Text>
              <Text style={styles.currentValue}>{currentTitle}</Text>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>New</Text>
            </>
          ) : (
            <Text style={styles.sectionLabel}>Workout name</Text>
          )}
          <TextInput
            value={nextTitle}
            onChangeText={setNextTitle}
            style={styles.input}
            accessibilityLabel="New workout name"
            placeholder={isFinishMode ? undefined : "Workout name"}
            placeholderTextColor={UI_TEXT_MUTED}
            autoFocus={isFinishMode}
          />
        </View>
        <Pressable
          onPress={async () => {
            const trimmed = nextTitle.trim();
            if (!trimmed) {
              Alert.alert("Invalid name", "Please enter a workout name.");
              return;
            }
            setSaving(true);
            try {
              const idToken = await getIdToken(false);
              if (!idToken) {
                Alert.alert("Sign in required", "You need to be signed in to save this name.");
                return;
              }
              const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
              const appliedAtIso = new Date().toISOString();
              const observedAtIso = titleAnchorObservedAt ?? appliedAtIso;
              const ingest = await logWorkoutTitleOverride(
                {
                  targetWorkoutId: workoutId.trim(),
                  displayName: trimmed,
                  observedAtIso,
                  timeZone,
                  appliedAtIso,
                  payloadTimeZone: timeZone,
                },
                idToken,
              );
              if (!ingest.ok) {
                const base =
                  ingest.error || "The server did not accept this rename. Your previous title is unchanged.";
                const details =
                  __DEV__ &&
                  ingest.json &&
                  typeof ingest.json === "object" &&
                  ingest.json !== null &&
                  "details" in ingest.json
                    ? `\n\n${JSON.stringify((ingest.json as { details: unknown }).details, null, 2)}`
                    : "";
                Alert.alert("Could not save name", `${base}${details}`);
                return;
              }
              if (__DEV__ && !process.env.JEST_WORKER_ID) {
                await devVerifyWorkoutTitleOverridePersisted({
                  getRawEvent,
                  idToken,
                  rawEventId: ingest.json.rawEventId,
                  expectedTargetId: workoutId,
                  expectedDisplayName: trimmed,
                });
              }
              invalidateWorkoutCalendarHydrate();
              try {
                await saveOverride(workoutId, { customTitle: trimmed });
              } catch {
                // optional local cache only
              }
              exitAfterSave();
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              Alert.alert("Could not save name", msg);
            } finally {
              setSaving(false);
            }
          }}
          style={[styles.primaryBtn, saving && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Save"
          disabled={saving}
        >
          <Text style={styles.primaryText}>{saving ? "Saving…" : "Save"}</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text style={styles.cancelText}>{isFinishMode ? "Skip for now" : "Cancel"}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 24, paddingHorizontal: 16, backgroundColor: UI_SCREEN_BG },
  title: { fontSize: 30, fontWeight: "800", color: UI_TEXT_PRIMARY, letterSpacing: -0.4 },
  description: { marginTop: 8, fontSize: 15, lineHeight: 22, color: UI_TEXT_SECONDARY, marginBottom: 20 },
  card: { ...elevatedCardSurfaceStyle, borderRadius: 16, padding: 16 },
  sectionLabel: { fontSize: 13, color: UI_TEXT_MUTED, marginBottom: 8, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  currentValue: { fontSize: 17, color: UI_TEXT_PRIMARY, fontWeight: "600", marginBottom: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: UI_BORDER_HAIRLINE, marginBottom: 14 },
  input: {
    backgroundColor: UI_SCREEN_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    color: UI_TEXT_PRIMARY,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    minHeight: 52,
  },
  primaryBtn: { marginTop: 20, backgroundColor: SYSTEM_ACCENT, borderRadius: 12, paddingVertical: 16, alignItems: "center", minHeight: 52 },
  disabled: { opacity: 0.6 },
  primaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  cancelBtn: { marginTop: 14, alignItems: "center", paddingVertical: 14, minHeight: 48 },
  cancelText: { fontSize: 16, color: UI_TEXT_SECONDARY, fontWeight: "600" },
});
