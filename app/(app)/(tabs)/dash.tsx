// app/(app)/(tabs)/dash.tsx
// Oli — Dash: title, subtitle, and "Manage your data" cards to real screens only.
import React, { useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { PageTitleRow } from "@/lib/ui/PageTitleRow";
import { SettingsGearButton } from "@/lib/ui/SettingsGearButton";

/** Cards that navigate to existing routes only. No Cardio/Steps — no dedicated routes. */
const MANAGE_DATA_CARDS = [
  { id: "body", title: "Body Composition", subtitle: "Log and track weight and body metrics", route: "/(app)/body/weight" as const },
  { id: "workouts", title: "Workouts", subtitle: "Log workouts and view history", route: "/(app)/workouts" as const },
  { id: "nutrition", title: "Nutrition", subtitle: "Log meals and set targets", route: "/(app)/nutrition" as const },
  { id: "sleep", title: "Sleep", subtitle: "View and manage sleep data", route: "/(app)/recovery/sleep" as const },
  { id: "readiness", title: "Readiness", subtitle: "Recovery and readiness metrics", route: "/(app)/recovery/readiness" as const },
  { id: "labs", title: "Labs", subtitle: "Lab results and biomarkers", route: "/(app)/labs" as const },
] as const;

const SCALE_PRESSED = 0.98;
const ANIM_DURATION = 100;

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
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
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
          <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function DashScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageTitleRow
          title="Oli"
          subtitle="Manage your health and fitness — all in one place."
          rightSlot={<SettingsGearButton />}
        />

        <Text style={styles.sectionLabel}>Manage your data</Text>

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
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
  },
  cards: {
    gap: 14,
  },
  card: {
    width: "100%",
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    padding: 20,
    minHeight: 88,
    justifyContent: "center",
  },
  cardPressed: { backgroundColor: "#EAEAEE" },
  cardInner: {},
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTextBlock: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#1C1C1E" },
  cardSubtitle: { fontSize: 14, color: "#6E6E73", marginTop: 4, lineHeight: 20 },
});
