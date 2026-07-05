import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { ProgramCategoryCardModel } from "@/lib/data/program/buildProgramCategoryCards";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

type Props = {
  cards: readonly ProgramCategoryCardModel[];
};

const ICONS: Record<ProgramCategoryCardModel["id"], keyof typeof Ionicons.glyphMap> = {
  weight: "body-outline",
  activity: "walk-outline",
  workout: "barbell-outline",
  cardio: "bicycle-outline",
  nutrition: "nutrition-outline",
};

function ProgramCategoryCard({ card }: { card: ProgramCategoryCardModel }) {
  const router = useRouter();
  const onPress = useCallback(() => {
    router.push(card.editHref as Href);
  }, [card.editHref, router]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}. ${card.targetSummary}${card.usesDefaultTarget ? ". Using default target" : ""}. ${card.todayRelevance}`}
      accessibilityHint="Edit target settings"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      testID={`program-category-${card.id}`}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={ICONS[card.id]} size={20} color={SYSTEM_ACCENT} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{card.title}</Text>
        <Text style={styles.target} numberOfLines={2}>
          {card.targetSummary}
          {card.usesDefaultTarget ? " (default)" : ""}
        </Text>
        <Text style={styles.relevance} numberOfLines={2}>
          {card.todayRelevance}
        </Text>
      </View>
      <Text style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
        {"\u203A"}
      </Text>
    </Pressable>
  );
}

export function ProgramCategoryCards({ cards }: Props): React.ReactElement {
  return (
    <View style={styles.wrap} testID="program-category-cards">
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Design your plan
      </Text>
      {cards.map((card) => (
        <ProgramCategoryCard key={card.id} card={card} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    marginBottom: 2,
  },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    padding: 14,
    backgroundColor: UI_CARD_SURFACE,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 72,
  },
  cardPressed: {
    opacity: 0.9,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(94, 232, 154, 0.12)",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  target: {
    fontSize: 14,
    lineHeight: 19,
    color: UI_TEXT_SECONDARY,
  },
  relevance: {
    fontSize: 12,
    lineHeight: 16,
    color: UI_TEXT_MUTED,
  },
  chevron: {
    fontSize: 18,
    color: UI_TEXT_MUTED,
  },
});
