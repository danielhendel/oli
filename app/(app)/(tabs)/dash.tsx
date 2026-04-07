// app/(app)/(tabs)/dash.tsx
// Oli — Dash: tab header, Stacks section (subtitle + Daily Recap + stack cards); recap reads as summary of Stacks.
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
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { SettingsGearButton } from "@/lib/ui/SettingsGearButton";
import { DashRecapCard } from "@/lib/ui/dash/DashRecapCard";
import { useDashRecapData } from "@/lib/data/dash/useDashRecapData";
import {
  UI_APP_SCREEN_BG,
  UI_CARD_SURFACE,
  UI_DASH_CATEGORY_CARD_RADIUS,
  UI_HEADER_CHROME_BG,
  UI_TAB_ROOT_CONTENT_GUTTER,
  UI_TAB_ROOT_INSET,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_SLATE_COOL,
} from "@/lib/ui/theme/uiTokens";

/** Cards that navigate to existing routes only. */
const MANAGE_DATA_CARDS = [
  { id: "body", title: "Body Composition", subtitle: "Log and track weight and body metrics", route: "/(app)/body/weight" as const },
  { id: "strength", title: "Strength", subtitle: "Lift, log sessions, and review training", route: "/(app)/workouts" as const },
  { id: "cardio", title: "Cardio", subtitle: "Runs, rides, and Apple Health sessions", route: "/(app)/cardio" as const },
  { id: "nutrition", title: "Nutrition", subtitle: "Log meals and set targets", route: "/(app)/nutrition" as const },
  { id: "sleep", title: "Sleep", subtitle: "View and manage sleep data", route: "/(app)/recovery/sleep" as const },
  { id: "readiness", title: "Readiness", subtitle: "Recovery and readiness metrics", route: "/(app)/recovery/readiness" as const },
  { id: "labs", title: "Labs", subtitle: "Lab results and biomarkers", route: "/(app)/labs" as const },
] as const;

const CATEGORY_CARD_PRESSED_BG = UI_HEADER_CHROME_BG;

const SCALE_PRESSED = 0.98;
const ANIM_DURATION = 100;

const STACKS_TAGLINE = "Optimize your health and fitness — all in one place.";

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
        <View style={styles.cardRow}>
          <View style={styles.cardTextBlock}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.cardChevronWrap}>
            <Ionicons name="chevron-forward" size={21} color={UI_TEXT_SECONDARY} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function DashScreen() {
  const router = useRouter();
  const recapModel = useDashRecapData();

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
                Stacks
              </Text>
              <Text style={styles.stacksTagline}>{STACKS_TAGLINE}</Text>
            </View>
            <View style={styles.recapInStacksSection}>
              <DashRecapCard model={recapModel} onViewMore={() => router.push("/(app)/dash/daily-recap")} />
            </View>
            <View style={styles.cards}>
              {MANAGE_DATA_CARDS.map((card) => (
                <DashCard
                  key={card.id}
                  title={card.title}
                  subtitle={card.subtitle}
                  onPress={() => router.push(card.route)}
                  accessibilityLabel={`${card.title}. ${card.subtitle}`}
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
  /** Stacks = parent section: heading, tagline, Daily Recap (section summary), then module cards. */
  stacksSection: {},
  /** Inset matches card inner padding so “Stacks” / tagline align with category row titles. */
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
  },
  /** Daily Recap sits inside Stacks — spacing after subtitle, before stack cards. */
  recapInStacksSection: {
    marginBottom: 16,
  },
  cards: {
    gap: 14,
  },
  card: {
    width: "100%",
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_DASH_CATEGORY_CARD_RADIUS,
    paddingVertical: 16,
    paddingHorizontal: UI_TAB_ROOT_CONTENT_GUTTER,
    minHeight: 68,
    justifyContent: "center",
  },
  cardInner: {},
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTextBlock: { flex: 1, minWidth: 0, paddingRight: 10 },
  cardChevronWrap: {
    justifyContent: "center",
    alignSelf: "center",
    paddingRight: 4,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: UI_TEXT_PRIMARY },
  cardSubtitle: {
    fontSize: 13,
    color: UI_TEXT_MUTED,
    marginTop: 4,
    lineHeight: 19,
  },
});
