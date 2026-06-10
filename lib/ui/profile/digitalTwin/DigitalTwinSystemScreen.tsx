// lib/ui/profile/digitalTwin/DigitalTwinSystemScreen.tsx
// System detail page: title, status chip, north-star metric, supporting rows, reference section.
// Presentational — route file wires data via useDigitalTwinHome.
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState, LoadingState, ScreenContainer } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_CARD_SURFACE,
  UI_GOAL_PILL_SURFACE,
  UI_TAB_ROOT_INSET,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import type { SystemVm } from "@/lib/features/profile/digitalTwin/types";
import { DigitalTwinMetricRow } from "@/lib/ui/profile/digitalTwin/DigitalTwinMetricRow";
import { DigitalTwinStatusChip } from "@/lib/ui/profile/digitalTwin/DigitalTwinStatusChip";

export type DigitalTwinSystemScreenProps = {
  system: SystemVm | null;
  loading: boolean;
  signedOut: boolean;
  updatedLabel: string | null;
  onPressRow: (href: string) => void;
  onPressCta: (href: string) => void;
  onBack: () => void;
};

export function DigitalTwinSystemScreen({
  system,
  loading,
  signedOut,
  updatedLabel,
  onPressRow,
  onPressCta,
  onBack,
}: DigitalTwinSystemScreenProps): React.ReactElement {
  if (signedOut) {
    return (
      <ScreenContainer>
        <EmptyState title="Sign in" description="Sign in to view this system." />
      </ScreenContainer>
    );
  }

  if (loading && system == null) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading system…" />
      </ScreenContainer>
    );
  }

  if (system == null) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <EmptyState
            title="System not found"
            description="We couldn't find that part of your Digital Twin."
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            testID="dt-system-back"
          >
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title} accessibilityRole="header">
            {system.title}
          </Text>
          <DigitalTwinStatusChip status={system.status} label={system.statusLabel} />
        </View>

        <Text style={styles.description}>{system.subtitle}</Text>

        <View style={styles.card}>
          {system.mainMetric != null ? (
            <Text style={styles.mainMetric} testID="dt-system-page-main">
              {system.mainMetric}
            </Text>
          ) : (
            <Text style={styles.noData} testID="dt-system-page-no-data">
              {system.needsData ? system.subtitle : "No data yet."}
            </Text>
          )}

          {system.rows.length > 0 ? (
            <View style={styles.rowsWrap}>
              {system.rows.map((row) => (
                <DigitalTwinMetricRow key={row.id} row={row} onPress={onPressRow} />
              ))}
            </View>
          ) : null}

          {system.needsData && system.ctaRoute && system.ctaLabel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={system.ctaLabel}
              onPress={() => system.ctaRoute && onPressCta(system.ctaRoute)}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
              testID="dt-system-page-cta"
            >
              <Text style={styles.ctaText}>{system.ctaLabel}</Text>
            </Pressable>
          ) : null}
        </View>

        {!system.needsData && updatedLabel ? (
          <View style={styles.referenceCard} testID="dt-system-reference">
            <Text style={styles.referenceLabel}>Source</Text>
            <Text style={styles.referenceValue}>From your Oli health record</Text>
            <Text style={styles.referenceLabel}>Updated</Text>
            <Text style={styles.referenceValue}>{updatedLabel}</Text>
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 12,
    paddingBottom: 48,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_SECONDARY,
  },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 12,
    padding: 15,
    gap: 8,
    marginTop: 8,
    backgroundColor: UI_CARD_SURFACE,
  },
  mainMetric: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  noData: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_MUTED,
  },
  rowsWrap: {
    gap: 6,
    marginTop: 4,
  },
  cta: {
    alignSelf: "flex-start",
    marginTop: 6,
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: UI_GOAL_PILL_SURFACE,
  },
  ctaText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  referenceCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 12,
    padding: 15,
    gap: 2,
    marginTop: 12,
    backgroundColor: UI_CARD_SURFACE,
  },
  referenceLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_MUTED,
    marginTop: 6,
  },
  referenceValue: {
    fontSize: 15,
    lineHeight: 20,
    color: UI_TEXT_PRIMARY,
    fontWeight: "500",
  },
  notFound: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
  },
  backBtn: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: UI_GOAL_PILL_SURFACE,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  pressed: {
    opacity: 0.85,
  },
});
