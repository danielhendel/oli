import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyCompositionInfluenceLink } from "@/lib/body/education/bodyCompositionEducationTypes";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyCompositionInfluenceSectionProps = {
  title: string;
  intro: string;
  influences: readonly BodyCompositionInfluenceLink[];
  onPressHref: (href: string) => void;
};

export function BodyCompositionInfluenceSection(props: BodyCompositionInfluenceSectionProps) {
  return (
    <View style={styles.section} testID="body-composition-influence-section">
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {props.title}
      </Text>
      <Text style={styles.intro}>{props.intro}</Text>
      <View style={styles.list}>
        {props.influences.map((item) => (
          <Pressable
            key={item.id}
            style={styles.row}
            onPress={() => props.onPressHref(item.href)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityHint={item.accessibilityHint}
            testID={`body-composition-influence-${item.id}`}
          >
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Text style={styles.chevron} accessibilityElementsHidden>
              ›
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.note}>These are influences, not Body Composition measurements.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "700",
  },
  intro: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    overflow: "hidden",
  },
  row: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_CARD_ELEVATED_BORDER,
  },
  rowLabel: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  chevron: {
    color: BODY_INDIGO,
    fontSize: 22,
    fontWeight: "300",
  },
  note: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
  },
});
