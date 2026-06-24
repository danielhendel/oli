// lib/ui/profile/ProfileMainScreen.tsx
// Health & Fitness Data home: collapsible system cards (General first, then health systems).
// Thin screen — all data comes from useDigitalTwinHome (composed server truths); no Firebase here.
import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { type Href, useRouter } from "expo-router";

import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import {
  UI_APP_SCREEN_BG,
  UI_TAB_ROOT_INSET,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import type { MassUnit, UserProfileMain } from "@oli/contracts";
import { isSuppressedProfileMainErrorMessage } from "@/lib/data/profile/profileTabViewModel";
import type { DigitalTwinHomeVm } from "@/lib/features/profile/digitalTwin/types";
import { DigitalTwinSystemCard } from "@/lib/ui/profile/digitalTwin/DigitalTwinSystemCard";
import { HealthAssessmentEntryCard } from "@/lib/ui/health-assessment/HealthAssessmentEntryCard";
import { HealthBaselineEntryCard } from "@/lib/ui/health-baseline/HealthBaselineEntryCard";
import { TargetStateEntryCard } from "@/lib/ui/target-state/TargetStateEntryCard";

export type ProfileMainScreenProps = {
  profile: UserProfileMain | null;
  status: "partial" | "ready" | "error" | "missing";
  /** First fetch in flight (server profile not yet received); list still renders from defaults. */
  hydrating?: boolean;
  /** PATCH in flight (server had a profile baseline). */
  isSaving?: boolean;
  errorMessage?: string | undefined;
  massUnit: MassUnit;
  twin: DigitalTwinHomeVm;
  healthAssessmentHref: string;
  healthAssessmentHasProgress: boolean;
  healthAssessmentCompletionPercent: number;
  healthBaselineHref: string;
  healthBaselineCompleteness: number | null;
  healthBaselineConfidence: string | null;
  targetStateHref: string;
  targetStateCoverage: number | null;
  targetStateConfidence: string | null;
};

export function ProfileMainScreen({
  status,
  hydrating = false,
  isSaving = false,
  errorMessage,
  twin,
  healthAssessmentHref,
  healthAssessmentHasProgress,
  healthAssessmentCompletionPercent,
  healthBaselineHref,
  healthBaselineCompleteness,
  healthBaselineConfidence,
  targetStateHref,
  targetStateCoverage,
  targetStateConfidence,
}: ProfileMainScreenProps) {
  const router = useRouter();
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const showLoadError =
    status === "error" &&
    typeof errorMessage === "string" &&
    errorMessage.length > 0 &&
    !isSuppressedProfileMainErrorMessage(errorMessage);

  const go = (href: string) => router.push(href as Href);

  return (
    <ScreenContainer padded={false}>
      <View style={styles.tabRoot}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          bounces
        >
          <TabRootScreenHeader title="Health & Fitness Data" />
          <View style={styles.scrollInner}>
            {showLoadError ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            {hydrating ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Updating…</Text>
              </View>
            ) : null}
            {isSaving ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Saving…</Text>
              </View>
            ) : null}

            <HealthAssessmentEntryCard
              hasProgress={healthAssessmentHasProgress}
              completionPercent={healthAssessmentCompletionPercent}
              onPress={() => go(healthAssessmentHref)}
            />

            <HealthBaselineEntryCard
              dataCompleteness={healthBaselineCompleteness}
              baselineConfidence={healthBaselineConfidence}
              onPress={() => go(healthBaselineHref)}
            />

            <TargetStateEntryCard
              dataCoveragePercent={targetStateCoverage}
              targetStateConfidence={targetStateConfidence}
              onPress={() => go(targetStateHref)}
            />

            {twin.systems.map((system) => (
              <DigitalTwinSystemCard key={system.id} system={system} onPressRow={go} />
            ))}

            <Text style={styles.disclaimer}>
              Oli is not a medical device and does not provide medical advice or diagnosis. Values
              reflect your own connected data. Always consult a qualified clinician for medical
              decisions.
            </Text>
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabRoot: { flex: 1, backgroundColor: UI_APP_SCREEN_BG },
  scroll: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollInner: {
    flexGrow: 1,
    paddingHorizontal: UI_TAB_ROOT_INSET,
  },
  errorText: {
    color: "#FF453A",
    fontSize: 15,
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 15,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  disclaimer: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
  },
});
