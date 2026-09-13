// lib/ui/navigation/AppNavigationDrawer.tsx
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";

import {
  APP_NAVIGATION_MENU_SECTIONS,
  type AppNavigationMenuItem,
} from "@/lib/navigation/appNavigationMenuItems";
import {
  PRIMARY_NAVIGATION_ITEMS,
  type PrimaryNavigationDestination,
} from "@/lib/navigation/primaryNavigationConfig";
import { navigatePrimaryDestination } from "@/lib/navigation/navigatePrimaryDestination";
import { resolvePrimaryNavActiveDestination } from "@/lib/navigation/resolvePrimaryNavActiveDestination";
import {
  UI_APP_SCREEN_BG,
  UI_BORDER_HAIRLINE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type AppNavigationDrawerProps = {
  visible: boolean;
  onClose: () => void;
};

export function AppNavigationDrawer({ visible, onClose }: AppNavigationDrawerProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(320, Math.max(280, Math.round(width * 0.82)));
  const activeDestination = resolvePrimaryNavActiveDestination({ pathname });

  const onSelect = (item: AppNavigationMenuItem) => {
    if (item.kind === "primary") {
      const navItem = PRIMARY_NAVIGATION_ITEMS.find((i) => i.id === item.destination);
      if (!navItem) {
        onClose();
        return;
      }
      if (activeDestination === item.destination) {
        onClose();
        return;
      }
      onClose();
      navigatePrimaryDestination({
        item: navItem,
        activeDestination,
        pathname,
        router,
      });
      return;
    }

    onClose();
    router.push(item.href);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.root} testID="app-navigation-drawer">
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close navigation menu"
        />
        <SafeAreaView
          edges={["top", "bottom", "left"]}
          style={[styles.panel, { width: drawerWidth }]}
          accessibilityLabel="Navigate"
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle} accessibilityRole="header">
              Navigate
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
              hitSlop={8}
              testID="app-navigation-drawer-close"
            >
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {APP_NAVIGATION_MENU_SECTIONS.map((section) => (
              <View key={section.id} style={styles.section}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  {section.title}
                </Text>
                {section.items.map((item) => {
                  const selected =
                    item.kind === "primary" && activeDestination === item.destination;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={item.accessibilityLabel}
                      accessibilityState={{ selected }}
                      onPress={() => onSelect(item)}
                      style={({ pressed }) => [
                        styles.row,
                        selected ? styles.rowSelected : null,
                        pressed ? styles.pressed : null,
                      ]}
                      testID={item.testID}
                    >
                      <Text style={[styles.rowLabel, selected ? styles.rowLabelSelected : null]}>
                        {item.label}
                      </Text>
                      {selected ? <Text style={styles.selectedMark}>Current</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/** Exported for tests — active primary destination helper. */
export function isPrimaryDestinationActive(
  destination: PrimaryNavigationDestination,
  active: PrimaryNavigationDestination | null,
): boolean {
  return active === destination;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  panel: {
    height: "100%",
    backgroundColor: UI_APP_SCREEN_BG,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: UI_BORDER_HAIRLINE,
    paddingBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER_HAIRLINE,
  },
  headerTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "700",
  },
  closeButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  closeLabel: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: "600",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 18,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  row: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowSelected: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  rowLabel: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "500",
    flexShrink: 1,
  },
  rowLabelSelected: {
    fontWeight: "700",
  },
  selectedMark: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
});
