// app/(app)/(tabs)/dash.tsx
// Oli — Dash: tab header + Daily Energy hero card.
import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { SettingsGearButton } from "@/lib/ui/SettingsGearButton";
import {
  UI_APP_SCREEN_BG,
  UI_TAB_ROOT_CONTENT_GUTTER,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
  UI_TEXT_SLATE_COOL,
} from "@/lib/ui/theme/uiTokens";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { useDailyEnergyCard } from "@/lib/data/dash/useDailyEnergyCard";
import { DailyEnergyCard } from "@/lib/ui/dash/DailyEnergyCard";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

const DASH_SECTION_TAGLINE = "Track, understand, and improve every part of your health.";

export default function DashScreen() {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const { energy, loading, error, refetch } = useDailyEnergyCard(getTodayDayKeyLocal());

  useFocusEffect(
    React.useCallback(() => {
      refetch({ cacheBust: "dashEnergyFocus" });
    }, [refetch]),
  );

  return (
    <ScreenContainer padded={false}>
      <View style={styles.root}>
        <TabRootScreenHeader title="Oli" rightSlot={<SettingsGearButton />} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scroll, { paddingBottom: scrollPaddingBottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stacksSection}>
            <View style={styles.stacksHeaderInset}>
              <Text style={styles.sectionHeading} accessibilityRole="header">
                Dash
              </Text>
              <Text style={styles.stacksTagline}>{DASH_SECTION_TAGLINE}</Text>
            </View>

            <DailyEnergyCard
              energy={energy}
              loading={loading}
              error={error}
            />
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
  scrollView: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  scroll: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 6,
    flexGrow: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  stacksSection: {},
  stacksHeaderInset: {
    paddingHorizontal: UI_TAB_ROOT_CONTENT_GUTTER,
  },
  sectionHeading: {
    marginTop: 18,
    marginBottom: 0,
    fontSize: 26,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  stacksTagline: {
    fontSize: 17,
    fontWeight: "400",
    color: UI_TEXT_SLATE_COOL,
    marginTop: 7,
    marginBottom: 12,
    lineHeight: 26,
    letterSpacing: 0.15,
    flexShrink: 1,
    alignSelf: "stretch",
  },
});
