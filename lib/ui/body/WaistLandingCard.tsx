import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { WaistLengthDisplayUnit } from "@/lib/body/presentation/bodyMetricManualEntryValidation";
import type { WaistHistoryPoint } from "@/lib/data/body/waistHistoryPoints";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  formatWaistCircumference,
  formatWaistMeasuredAtLabel,
} from "@/lib/ui/body/waistDisplayFormat";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type WaistLandingCardProps = {
  /** Presentation latest from dated RawEvents only — never profile bodyInputs. */
  latest: WaistHistoryPoint | null;
  lengthUnit: WaistLengthDisplayUnit;
  status: "partial" | "error" | "ready";
  onPressCard: () => void;
  onPressAdd: () => void;
};

/**
 * Body Measurements landing card for standardized waist circumference.
 * Empty when there is no dated measurement — does not show undated profile waist.
 */
export function WaistLandingCard(props: WaistLandingCardProps) {
  const hasLatest = props.latest != null;
  const valueLabel =
    props.latest != null
      ? formatWaistCircumference(props.latest.waistCm, props.lengthUnit)
      : null;
  const dateLabel =
    props.latest != null ? formatWaistMeasuredAtLabel(props.latest.observedAt) : null;

  return (
    <Pressable
      onPress={props.onPressCard}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={
        hasLatest && valueLabel != null && dateLabel != null
          ? `Waist ${valueLabel}, measured ${dateLabel}. Open waist history.`
          : "Waist. Add a waist measurement. Open waist history."
      }
      testID="waist-landing-card"
    >
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          Waist
        </Text>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            props.onPressAdd();
          }}
          hitSlop={8}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="Add a waist measurement"
          testID="waist-landing-card-add"
        >
          <Text style={styles.addLabel}>Add</Text>
        </Pressable>
      </View>

      {props.status === "partial" && !hasLatest ? (
        <Text style={styles.muted} testID="waist-landing-card-loading">
          Loading…
        </Text>
      ) : hasLatest && valueLabel != null ? (
        <View style={styles.valueBlock} testID="waist-landing-card-latest">
          <Text style={styles.value}>{valueLabel}</Text>
          {dateLabel != null ? (
            <Text style={styles.date} testID="waist-landing-card-date">
              {dateLabel}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyBlock} testID="waist-landing-card-empty">
          <Text style={styles.emptyTitle}>Add a waist measurement</Text>
          <Text style={styles.emptyBody}>
            Add a dated measurement to track changes.
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Section wrapper: Body Measurements heading + waist card.
 */
export function BodyMeasurementsLandingSection(props: WaistLandingCardProps) {
  return (
    <View style={styles.section} testID="body-composition-body-measurements-section">
      <Text
        accessibilityRole="header"
        style={styles.sectionHeading}
        testID="body-composition-heading-body-measurements"
      >
        Body Measurements
      </Text>
      <WaistLandingCard {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionHeading: {
    color: UI_TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
    paddingHorizontal: 2,
  },
  card: {
    ...elevatedCardSurfaceStyle,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  pressed: { opacity: 0.92 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "700",
  },
  addBtn: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: {
    color: BODY_INDIGO,
    fontSize: 15,
    fontWeight: "700",
  },
  valueBlock: { gap: 4 },
  value: {
    color: UI_TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  date: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: "500",
  },
  emptyBlock: { gap: 4 },
  emptyTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "600",
  },
  emptyBody: {
    color: UI_TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  muted: {
    color: UI_TEXT_MUTED,
    fontSize: 14,
  },
});
