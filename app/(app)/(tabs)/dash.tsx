// app/(app)/(tabs)/dash.tsx
// Oli — Dash: tab header, section heading + tagline, Activity/Strength baselines, category cards.
import React, { useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { SettingsGearButton } from "@/lib/ui/SettingsGearButton";
import { ActivityBaselineDashCard } from "@/components/dashboard/ActivityBaselineDashCard";
import { StrengthBaselineDashCard } from "@/components/dashboard/StrengthBaselineDashCard";
import { useActivityBaseline } from "@/lib/hooks/useActivityBaseline";
import { useStrengthBaseline } from "@/lib/hooks/useStrengthBaseline";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  UI_APP_SCREEN_BG,
  UI_CARD_SURFACE,
  UI_HEADER_CHROME_BG,
  UI_TAB_ROOT_CONTENT_GUTTER,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
  UI_TEXT_SLATE_COOL,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

/** Cards that navigate to existing routes only. */
const MANAGE_DATA_CARDS = [
  {
    id: "body",
    title: "Body Composition",
    subtitle: "Log and track weight and body metrics",
    route: "/(app)/body/weight" as const,
    opensLabel: "Body Composition",
  },
  {
    id: "cardio",
    title: "Cardio",
    subtitle: "Runs, rides, and Apple Health sessions",
    route: "/(app)/cardio" as const,
    opensLabel: "Cardio",
  },
  {
    id: "nutrition",
    title: "Nutrition",
    subtitle: "Log meals and set targets",
    route: "/(app)/nutrition" as const,
    opensLabel: "Nutrition",
  },
  {
    id: "sleep",
    title: "Sleep",
    subtitle: "View and manage sleep data",
    route: "/(app)/recovery/sleep" as const,
    opensLabel: "Sleep",
  },
  {
    id: "readiness",
    title: "Readiness",
    subtitle: "Recovery and readiness metrics",
    route: "/(app)/recovery/readiness" as const,
    opensLabel: "Readiness",
  },
  {
    id: "labs",
    title: "Labs",
    subtitle: "Lab results and biomarkers",
    route: "/(app)/labs" as const,
    opensLabel: "Labs",
  },
] as const;

const CATEGORY_CARD_PRESSED_BG = UI_HEADER_CHROME_BG;

const SCALE_PRESSED = 0.98;
const ANIM_DURATION = 100;

const DASH_SECTION_TAGLINE = "Track, understand, and improve every part of your health.";

type DashCardProps = {
  title: string;
  subtitle: string;
  onPress: () => void;
  accessibilityLabel: string;
};

function DashCard({ title, subtitle, onPress, accessibilityLabel }: DashCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.timing(scale, {
      toValue: SCALE_PRESSED,
      duration: ANIM_DURATION,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: ANIM_DURATION,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? CATEGORY_CARD_PRESSED_BG : UI_CARD_SURFACE },
      ]}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Animated.View style={[styles.cardInner, { transform: [{ scale }] }]}>
        <View style={styles.cardTextBlock}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function DashScreen() {
  const router = useRouter();
  const activityBaseline = useActivityBaseline();
  const strengthBaseline = useStrengthBaseline();

  return (
    <ScreenContainer padded={false}>
      <View style={styles.root}>
        <TabRootScreenHeader title="Oli" rightSlot={<SettingsGearButton />} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scroll}
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
            <View style={styles.baselineCardsColumn}>
              <ActivityBaselineDashCard
                hasUser={activityBaseline.user != null}
                loading={activityBaseline.loading}
                error={activityBaseline.error}
                model={activityBaseline.model}
                onPress={() => router.push("/(app)/activity")}
              />
              <StrengthBaselineDashCard
                hasUser={strengthBaseline.user != null}
                loading={strengthBaseline.loading}
                error={strengthBaseline.error}
                model={strengthBaseline.model}
                onPress={() => router.push("/(app)/workouts")}
              />
            </View>
            <View style={styles.cards}>
              {MANAGE_DATA_CARDS.map((card) => (
                <DashCard
                  key={card.id}
                  title={card.title}
                  subtitle={card.subtitle}
                  onPress={() => router.push(card.route)}
                  accessibilityLabel={`${card.title}. ${card.subtitle}. Opens ${card.opensLabel}.`}
                />
              ))}
            </View>
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
    paddingBottom: 40,
    flexGrow: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  /** Section: heading, tagline, Activity + Strength baseline cards, then category cards. */
  stacksSection: {},
  /** Inset matches card inner padding so heading / tagline align with category row titles. */
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
  /** Activity + Strength baseline cards — spacing after subtitle, before stack cards. */
  baselineCardsColumn: {
    gap: 14,
    marginBottom: 16,
  },
  cards: {
    gap: 14,
  },
  card: {
    width: "100%",
    ...elevatedCardSurfaceStyle,
    /** Matches {@link ActivityDailyDetailsCard} / {@link StrengthFrequencyMetricCard} elevated shells. */
    borderRadius: 12,
    padding: 15,
    minHeight: 44,
    justifyContent: "center",
  },
  cardInner: {},
  cardTextBlock: { flex: 1, minWidth: 0, gap: 5 },
  cardTitle: strengthMetricCardTitleTextStyle,
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: -0.2,
  },
});
