// app/(app)/(tabs)/progress.tsx
// Oli — Progress: real Weekly Progress and history links. No fabricated analytics.
import React from "react";
import { ScrollView, View, StyleSheet, Text } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import { FLOATING_TAB_ROOT_SCROLL_EXTRA, useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import {
  WEEKLY_PROGRESS_CONSUMER_TITLE,
  WEEKLY_PROGRESS_SUPPORTING_COPY,
  isDashWeeklyProgressRelocationEnabled,
} from "@/lib/data/dash/dashWeeklyProgressRelocation";
import { WeeklyFitnessCardHost } from "@/lib/ui/dash/WeeklyFitnessCardHost";
import {
  PROGRESS_HISTORY_LINKS,
  PROGRESS_QUESTION,
} from "@/lib/navigation/progressHistoryLinks";

export default function ProgressScreen() {
  const router = useRouter();
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(FLOATING_TAB_ROOT_SCROLL_EXTRA);
  const showWeeklyProgress = isDashWeeklyProgressRelocationEnabled();

  return (
    <ScreenContainer padded={false}>
      <View style={styles.root}>
        <TabRootScreenHeader title="Progress" subtitle={PROGRESS_QUESTION} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
          showsVerticalScrollIndicator={false}
          testID="progress-history-scroll"
        >
          {showWeeklyProgress ? (
            <View
              testID="progress-weekly-progress-section"
              accessibilityLabel="Weekly progress section"
            >
              <WeeklyFitnessCardHost
                title={WEEKLY_PROGRESS_CONSUMER_TITLE}
                subtitle={WEEKLY_PROGRESS_SUPPORTING_COPY}
                cardAccessibilityLabel="Weekly Progress card"
              />
            </View>
          ) : null}
          <View testID="progress-history-section" accessibilityLabel="History">
            <Text style={styles.sectionTitle}>History</Text>
            {PROGRESS_HISTORY_LINKS.map((item) => (
              <ModuleSectionLinkRow
                key={item.id}
                title={item.label}
                accessibilityLabel={item.accessibilityLabel}
                testID={item.testID}
                onPress={() => router.push(item.href as Href)}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 4,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
});
