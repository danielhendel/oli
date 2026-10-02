// lib/ui/body-scans/BodyScansLandingSection.tsx
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyScanListItemDto, BodyScanType } from "@/lib/contracts";
import {
  BODY_SCAN_LIST_PAGE_MAX,
  groupBodyScansByCategory,
} from "@/lib/data/body-scans/groupBodyScansByCategory";
import { BodyScanCategoryList } from "@/lib/ui/body-scans/BodyScanCategoryList";
import { BodyScanCategoryTypeChooser } from "@/lib/ui/body-scans/BodyScanCategoryTypeChooser";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyScansLandingSectionProps = {
  status: "partial" | "error" | "ready";
  items?: readonly BodyScanListItemDto[];
  /** True when the list page is proven complete (items.length < server max). */
  listComplete?: boolean;
  onPressCategory: (scanType: BodyScanType) => void;
  onPressAddWithType: (scanType: BodyScanType) => void;
};

/**
 * Body Scans entry point on the Body Composition landing page.
 *
 * Category-first navigator — point-in-time scans stay separate from continuous trends.
 */
export function BodyScansLandingSection({
  status,
  items = [],
  listComplete,
  onPressCategory,
  onPressAddWithType,
}: BodyScansLandingSectionProps) {
  const [chooserOpen, setChooserOpen] = useState(false);

  const grouped = useMemo(() => {
    const complete =
      listComplete ?? (status === "ready" && items.length < BODY_SCAN_LIST_PAGE_MAX);
    return groupBodyScansByCategory(items, { listComplete: complete });
  }, [items, listComplete, status]);

  return (
    <View style={styles.section} testID="body-composition-body-scans-section">
      <View style={styles.headerRow}>
        <Text
          accessibilityRole="header"
          style={styles.sectionHeading}
          testID="body-composition-heading-body-scans"
        >
          Body Scans
        </Text>
        <Pressable
          onPress={() => setChooserOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Add a body scan"
          accessibilityHint="Choose a scan category to upload"
          style={styles.addBtn}
          testID="body-scans-section-add"
        >
          <Text style={styles.addLabel}>Add</Text>
        </Pressable>
      </View>

      {status === "partial" ? (
        <View style={styles.card} testID="body-scans-section-loading">
          <Text style={styles.cardBody}>Loading scans…</Text>
        </View>
      ) : null}

      {status === "error" ? (
        <View style={styles.card}>
          <Text style={styles.cardBody} testID="body-scans-section-error">
            Your scans could not be loaded right now.
          </Text>
        </View>
      ) : null}

      {status === "ready" ? (
        <BodyScanCategoryList
          groups={grouped.groups}
          onPressCategory={onPressCategory}
          testID="body-scans-section-category-list"
        />
      ) : null}

      <BodyScanCategoryTypeChooser
        visible={chooserOpen}
        onClose={() => setChooserOpen(false)}
        onSelect={onPressAddWithType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    color: UI_TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
    flexShrink: 1,
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
  card: { ...elevatedCardSurfaceStyle, paddingHorizontal: 16, paddingVertical: 14 },
  cardBody: { color: UI_TEXT_SECONDARY, fontSize: 14 },
});

export const BODY_SCANS_LANDING_MUTED = UI_TEXT_MUTED;
