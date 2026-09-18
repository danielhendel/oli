import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BODY_COMPOSITION_SUMMARY_COPY,
} from "@/lib/body/presentation/buildBodyMetricSummaryCards";
import type { BodyMetricCardModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import { BODY_METRIC_RANGES_EXPLAINER_HREF } from "@/lib/data/body/bodyCompositionMetricRoutes";
import { BodyMetricSummaryCard } from "@/lib/ui/body/BodyMetricSummaryCard";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyCompositionSummaryScreenProps = {
  cards: readonly BodyMetricCardModel[];
  appleHealthSlot: React.ReactNode;
  onPressCard: (href: string) => void;
  onPressAddWeight: () => void;
  onPressHref: (href: string) => void;
  /** Optional inline measurement error (education/cards remain visible). */
  measurementErrorSlot?: React.ReactNode;
};

/**
 * Simplified Stage 3B landing: purpose + three metric cards + compact actions.
 * Dense education lives behind progressive disclosure (detail routes / ranges explainer).
 */
export function BodyCompositionSummaryScreen(props: BodyCompositionSummaryScreenProps) {
  const copy = BODY_COMPOSITION_SUMMARY_COPY;
  const ordered = props.cards;

  return (
    <View style={styles.root} testID="body-composition-summary-screen">
      <Text style={styles.purpose} accessibilityRole="header" testID="body-composition-purpose">
        {copy.purpose}
      </Text>

      {props.measurementErrorSlot}

      <View style={styles.cards} testID="body-composition-metric-cards">
        {ordered.map((card) => (
          <BodyMetricSummaryCard
            key={card.metric}
            model={card}
            onPress={() => props.onPressCard(card.detailHref)}
            onPressAddMeasurement={
              card.metric === "weight" && card.readiness === "missing"
                ? props.onPressAddWeight
                : card.readiness === "missing"
                  ? props.onPressAddWeight
                  : undefined
            }
          />
        ))}
      </View>

      <View style={styles.actions} testID="body-composition-actions">
        <Text style={styles.actionsTitle} accessibilityRole="header">
          {copy.actionsTitle}
        </Text>

        <Pressable
          style={styles.actionBtn}
          onPress={props.onPressAddWeight}
          accessibilityRole="button"
          accessibilityLabel={copy.addWeightLabel}
          accessibilityHint="Opens manual weight entry"
          testID="body-composition-add-weight"
        >
          <Text style={styles.actionBtnText}>{copy.addWeightLabel}</Text>
        </Pressable>

        <View style={styles.appleHealthSlot} testID="body-composition-baseline-apple-health">
          {props.appleHealthSlot}
        </View>

        <Pressable
          style={styles.linkRow}
          onPress={() => props.onPressHref(copy.historyHref)}
          accessibilityRole="button"
          accessibilityLabel={copy.historyLabel}
          testID="body-composition-view-history"
        >
          <Text style={styles.linkText}>{copy.historyLabel}</Text>
        </Pressable>

        <Pressable
          style={styles.linkRow}
          onPress={() => props.onPressHref(copy.settingsHref)}
          accessibilityRole="button"
          accessibilityLabel={copy.settingsLabel}
          testID="body-composition-view-settings"
        >
          <Text style={styles.linkText}>{copy.settingsLabel}</Text>
        </Pressable>

        <Pressable
          style={styles.linkRow}
          onPress={() => props.onPressHref(BODY_METRIC_RANGES_EXPLAINER_HREF)}
          accessibilityRole="button"
          accessibilityLabel={copy.rangesExplainerLabel}
          testID="body-composition-ranges-explainer"
        >
          <Text style={styles.linkText}>{copy.rangesExplainerLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },
  purpose: {
    color: UI_TEXT_SECONDARY,
    fontSize: 16,
    lineHeight: 22,
  },
  cards: {
    gap: 12,
  },
  actions: {
    gap: 10,
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    padding: 14,
  },
  actionsTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  actionBtn: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: BODY_INDIGO,
    borderRadius: 10,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  appleHealthSlot: {
    gap: 8,
  },
  linkRow: {
    minHeight: 44,
    justifyContent: "center",
  },
  linkText: {
    color: BODY_INDIGO,
    fontSize: 15,
    fontWeight: "600",
  },
});
