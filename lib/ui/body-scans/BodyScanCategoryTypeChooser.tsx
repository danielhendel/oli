// lib/ui/body-scans/BodyScanCategoryTypeChooser.tsx
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyScanType } from "@/lib/contracts";
import { BODY_SCAN_CATEGORY_DEFINITIONS } from "@/lib/data/body-scans/bodyScanCategoryCatalog";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyScanCategoryTypeChooserProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (scanType: BodyScanType) => void;
};

/**
 * Simple category picker for the Body Scans section Add action.
 * Reuses the shared category catalog — no duplicate type labels.
 */
export function BodyScanCategoryTypeChooser({
  visible,
  onClose,
  onSelect,
}: BodyScanCategoryTypeChooserProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityLabel="Close scan type chooser"
        testID="body-scan-type-chooser-overlay"
      >
        <Pressable
          style={styles.sheet}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
          testID="body-scan-type-chooser"
        >
          <Text style={styles.title} accessibilityRole="header">
            Add scan
          </Text>
          <Text style={styles.subtitle}>Choose a scan category</Text>
          <View style={styles.list}>
            {BODY_SCAN_CATEGORY_DEFINITIONS.map((def, index) => (
              <Pressable
                key={def.type}
                onPress={() => {
                  onSelect(def.type);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={def.addLabel}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && styles.rowDivider,
                  pressed && styles.rowPressed,
                ]}
                testID={`body-scan-type-chooser-${def.type}`}
              >
                <Text style={styles.rowLabel}>{def.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [styles.cancel, pressed && styles.rowPressed]}
            testID="body-scan-type-chooser-cancel"
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
    padding: 16,
    paddingBottom: 32,
  },
  sheet: {
    ...elevatedCardSurfaceStyle,
    paddingTop: 18,
    paddingBottom: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
  },
  list: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  rowPressed: { opacity: 0.75 },
  rowLabel: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  cancel: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  cancelLabel: {
    color: SYSTEM_ACCENT,
    fontSize: 16,
    fontWeight: "600",
  },
});
