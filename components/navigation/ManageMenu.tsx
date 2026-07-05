import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  MANAGE_HUB_ITEMS,
  type ManageHubItem,
} from "@/components/navigation/manageHubItems";
import { manageHubIconName } from "@/lib/ui/navigation/manageHubIcons";
import {
  UI_BORDER_STRONG,
  UI_BORDER_SUBTLE,
  UI_OVERLAY,
  UI_PANEL_SURFACE,
  UI_SURFACE_PRESSED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type ManageMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ManageMenuProps = {
  visible: boolean;
  onClose: () => void;
  anchor: ManageMenuAnchor | null;
};

type MenuRow =
  | { kind: "module"; item: ManageHubItem }
  | { kind: "close" };

const MENU_ROW_COUNT = MANAGE_HUB_ITEMS.length + 1;

const GAP_ABOVE_FAB = 10;
const MENU_PAD = 14;
const STAGGER_MS = 42;

function ModuleIcon({ id }: { id: string }) {
  const name = manageHubIconName(id);
  return (
    <View style={styles.iconCircle}>
      <Ionicons name={name} size={20} color={UI_TEXT_PRIMARY} />
    </View>
  );
}

export function ManageMenu({ visible, onClose, anchor }: ManageMenuProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const backdropOpacity = useRef(new Animated.Value(0)).current;

  /** Visual order matches MANAGE_HUB_ITEMS: Body → … → DNA, then Close under the stack near the FAB. */
  const rowsTopToBottom = useMemo((): MenuRow[] => {
    const modules = MANAGE_HUB_ITEMS.map((item) => ({
      kind: "module" as const,
      item,
    }));
    return [...modules, { kind: "close" as const }];
  }, []);

  const rowAnims = useRef(
    Array.from({ length: MENU_ROW_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (!visible || !anchor) {
      rowAnims.forEach((v) => v.setValue(0));
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
      return;
    }

    rowAnims.forEach((v) => v.setValue(0));
    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const bottomFirstOrder = [...rowAnims].reverse();
    Animated.stagger(
      STAGGER_MS,
      bottomFirstOrder.map((a) =>
        Animated.timing(a, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [visible, anchor, backdropOpacity, rowAnims]);

  if (!visible || !anchor) {
    return null;
  }

  const menuWidth = Math.min(300, windowWidth - MENU_PAD * 2);
  const rightEdge = anchor.x + anchor.width;
  const rightOffset = Math.max(MENU_PAD, windowWidth - rightEdge);

  const menuOpensFromTop = anchor.y < windowHeight * 0.45;
  const spaceAboveFab = anchor.y - insets.top - GAP_ABOVE_FAB;
  const maxMenuHeight = menuOpensFromTop
    ? Math.min(windowHeight * 0.78, Math.max(200, windowHeight - anchor.y - anchor.height - insets.bottom - 24))
    : Math.min(windowHeight * 0.78, Math.max(200, spaceAboveFab - 12));

  const menuBottomFromScreenBottom = windowHeight - anchor.y + GAP_ABOVE_FAB;
  const menuTopFromScreenTop = anchor.y + anchor.height + GAP_ABOVE_FAB;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot} accessibilityViewIsModal>
        <Animated.View style={[styles.dimLayer, { opacity: backdropOpacity }]}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: UI_OVERLAY }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss Manage menu"
          />
        </Animated.View>

        <View
          testID="oli-manage-menu"
          style={[
            styles.menuWrap,
            {
              width: menuWidth,
              maxHeight: maxMenuHeight,
              ...(menuOpensFromTop
                ? { top: menuTopFromScreenTop }
                : { bottom: menuBottomFromScreenBottom }),
              right: rightOffset,
              zIndex: 2,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={[styles.menuPanel, { maxHeight: maxMenuHeight }]}>
            <ScrollView
              style={styles.menuScroll}
              contentContainerStyle={styles.menuScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
              bounces={true}
            >
              {rowsTopToBottom.map((row, index) => {
                const opacity = rowAnims[index]!;
                const translateY = opacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                });

                if (row.kind === "close") {
                  return (
                    <Animated.View
                      key="close"
                      style={{ opacity, transform: [{ translateY }] }}
                    >
                      <Pressable
                        testID="manage-menu-close"
                        accessibilityRole="button"
                        accessibilityLabel="Close Manage menu"
                        onPress={onClose}
                        style={({ pressed }) => [
                          styles.closeRow,
                          pressed && styles.closeRowPressed,
                        ]}
                      >
                        <View style={styles.rowCluster}>
                          <Text style={styles.closeLabel}>Close</Text>
                          <View style={styles.iconCircleMuted}>
                            <Ionicons name="close" size={22} color={UI_TEXT_PRIMARY} />
                          </View>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                }

                const item = row.item;

                const onRowPress = () => {
                  router.push(item.href as never);
                  onClose();
                };

                return (
                  <Animated.View
                    key={item.id}
                    style={{ opacity, transform: [{ translateY }] }}
                  >
                    <Pressable
                      testID={`manage-hub-${item.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={item.accessibilityLabel}
                      onPress={onRowPress}
                      style={({ pressed }) => [
                        styles.moduleRow,
                        pressed && styles.moduleRowPressed,
                      ]}
                    >
                      <View style={styles.rowCluster}>
                        <Text style={styles.moduleLabel} numberOfLines={2}>
                          {item.label}
                        </Text>
                        <ModuleIcon id={item.id} />
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  menuWrap: {
    position: "absolute",
  },
  menuPanel: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: UI_PANEL_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_STRONG,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: { elevation: 18 },
      default: {},
    }),
  },
  menuScroll: {},
  menuScrollContent: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    paddingBottom: 14,
    gap: 6,
    flexGrow: 1,
  },
  rowCluster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    width: "100%",
  },
  moduleRow: {
    alignSelf: "stretch",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: "center",
  },
  moduleRowPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  moduleLabel: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    textAlign: "right",
    maxWidth: "72%",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI_SURFACE_PRESSED,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_SUBTLE,
  },
  iconCircleMuted: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI_SURFACE_PRESSED,
    alignItems: "center",
    justifyContent: "center",
  },
  closeRow: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_SUBTLE,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  closeRowPressed: {
    opacity: 0.85,
  },
  closeLabel: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    textAlign: "right",
    maxWidth: "72%",
  },
});
