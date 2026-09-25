// lib/ui/body-scans/BodyScansLandingSection.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyScanListItemDto } from "@/lib/contracts";
import { BodyScanRow } from "@/lib/ui/body-scans/BodyScanListContent";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyScansLandingSectionProps = {
  status: "partial" | "error" | "ready";
  items?: readonly BodyScanListItemDto[];
  maxItems?: number;
  onPressScan: (scanId: string) => void;
  onPressSeeAll: () => void;
  onPressUpload: () => void;
};

/**
 * Body Scans entry point on the Body Composition landing page.
 *
 * Scans sit in their own section on purpose: a point-in-time scan is not a reading on the
 * Weight, Body Fat, or Lean Mass trends, and is never merged into them.
 */
export function BodyScansLandingSection({
  status,
  items = [],
  maxItems = 2,
  onPressScan,
  onPressSeeAll,
  onPressUpload,
}: BodyScansLandingSectionProps) {
  const visible = items.slice(0, maxItems);

  return (
    <View style={styles.section} testID="body-composition-body-scans-section">
      <Text
        accessibilityRole="header"
        style={styles.sectionHeading}
        testID="body-composition-heading-body-scans"
      >
        Body Scans
      </Text>
      <Text style={styles.note}>
        Scan measurements are kept with the scan, separate from your day-to-day trends.
      </Text>

      {status === "error" ? (
        <View style={styles.card}>
          <Text style={styles.cardBody} testID="body-scans-section-error">
            Your scans could not be loaded right now.
          </Text>
        </View>
      ) : null}

      {status === "ready" && visible.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardBody} testID="body-scans-section-empty">
            No scans yet. Upload a DXA report to see its measurements here.
          </Text>
        </View>
      ) : null}

      {visible.map((item) => (
        <BodyScanRow key={item.id} item={item} onPress={() => onPressScan(item.id)} />
      ))}

      <View style={styles.actions}>
        <Pressable
          onPress={onPressUpload}
          accessibilityRole="button"
          accessibilityLabel="Upload a scan report"
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          testID="body-scans-section-upload"
        >
          <Text style={styles.actionLabel}>Upload a scan</Text>
        </Pressable>
        {items.length > 0 ? (
          <Pressable
            onPress={onPressSeeAll}
            accessibilityRole="button"
            accessibilityLabel="See all scans"
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            testID="body-scans-section-see-all"
          >
            <Text style={styles.actionLabel}>See all scans</Text>
          </Pressable>
        ) : null}
      </View>
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
  note: { color: UI_TEXT_SECONDARY, fontSize: 13, paddingHorizontal: 2 },
  card: { ...elevatedCardSurfaceStyle, paddingHorizontal: 16, paddingVertical: 14 },
  cardBody: { color: UI_TEXT_SECONDARY, fontSize: 14 },
  actions: { flexDirection: "row", gap: 10 },
  action: {
    ...elevatedCardSurfaceStyle,
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  actionPressed: { opacity: 0.85 },
  actionLabel: { color: UI_TEXT_PRIMARY, fontSize: 14, fontWeight: "600" },
});
