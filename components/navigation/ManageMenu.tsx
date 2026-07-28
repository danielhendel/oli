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
} from "@/components/navigation/manageHubItems";
import { manageHubIconName } from "@/lib/ui/navigation/manageHubIcons";
import { healthHubIconName } from "@/lib/ui/navigation/healthHubIcons";
import {
  UI_BORDER_STRONG,
  UI_BORDER_SUBTLE,
  UI_OVERLAY,
  UI_PANEL_SURFACE,
  UI_SURFACE_PRESSED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type ManageMenuPresentation = "fab" | "popover";

export type ManageMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
  presentation?: ManageMenuPresentation;
};

/** Shared shape for Manage and Health hub rows. */
export type HubMenuItem = {
  id: string;
  label: string;
  accessibilityLabel: string;
  href: string;
  testID?: string;
};

export type ManageMenuProps = {
  visible: boolean;
  onClose: () => void;
  anchor: ManageMenuAnchor | null;
  /** Hub rows (defaults to legacy Manage items). */
  items?: readonly HubMenuItem[];
  menuTestID?: string;
  dismissAccessibilityLabel?: string;
  closeRowAccessibilityLabel?: string;
  hubRowTestIDPrefix?: string;
};

type MenuRow =
  | { kind: "module"; item: HubMenuItem }
  | { kind: "close" };

const GAP_ABOVE_FAB = 10;
const GAP_BELOW_HEADER = 8;
const MENU_PAD = 14;
const STAGGER_MS = 42;
/** Light scrim for header popover — keeps Dash readable behind the menu. */
const POPOVER_SCRIM = "rgba(0,0,0,0.16)";

function resolvePresentation(
  anchor: ManageMenuAnchor,
  windowHeight: number,
): ManageMenuPresentation {
  if (anchor.presentation != null) return anchor.presentation;
  return anchor.y < windowHeight * 0.45 ? "popover" : "fab";
}

function hubIconName(id: string): React.ComponentProps<typeof Ionicons>["name"] {
  const health = healthHubIconName(id);
  if (health !== "ellipse-outline") return health;
  return manageHubIconName(id);
}

function ModuleIconFab({ id }: { id: string }) {
  const name = hubIconName(id);
  return (
    <View style={styles.iconCircleFab}>
      <Ionicons name={name} size={20} color={UI_TEXT_PRIMARY} />
    </View>
  );
}

function ModuleIconPopover({ id }: { id: string }) {
  const name = hubIconName(id);
  return (
    <View style={styles.iconCirclePopover}>
      <Ionicons name={name} size={18} color={UI_TEXT_PRIMARY} />
    </View>
  );
}

export function ManageMenu({
  visible,
  onClose,
  anchor,
  items = MANAGE_HUB_ITEMS as readonly HubMenuItem[],
  menuTestID = "oli-manage-menu",
  dismissAccessibilityLabel = "Dismiss Manage menu",
  closeRowAccessibilityLabel = "Close Manage menu",
  hubRowTestIDPrefix = "manage-hub",
}: ManageMenuProps): React.ReactElement | null {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const itemCount = items.length;
  const menuRowCount = itemCount + 1;

  const rowsTopToBottom = useMemo((): MenuRow[] => {
    const modules = items.map((item) => ({
      kind: "module" as const,
      item,
    }));
    return [...modules, { kind: "close" as const }];
  }, [items]);

  const popoverRows = useMemo((): { kind: "module"; item: HubMenuItem }[] => {
    return items.map((item) => ({ kind: "module" as const, item }));
  }, [items]);

  const rowAnims = useRef<Animated.Value[]>([]).current;
  while (rowAnims.length < menuRowCount) {
    rowAnims.push(new Animated.Value(0));
  }

  const popoverRowAnims = useRef<Animated.Value[]>([]).current;
  while (popoverRowAnims.length < itemCount) {
    popoverRowAnims.push(new Animated.Value(0));
  }

  useEffect(() => {
    if (!visible || !anchor) {
      rowAnims.forEach((v) => v.setValue(0));
      popoverRowAnims.forEach((v) => v.setValue(0));
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
      return;
    }

    const presentation = resolvePresentation(anchor, windowHeight);
    const anims = presentation === "popover" ? popoverRowAnims : rowAnims;

    anims.forEach((v) => v.setValue(0));
    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: presentation === "popover" ? 160 : 200,
      useNativeDriver: true,
    }).start();

    if (presentation === "popover") {
      Animated.stagger(
        24,
        popoverRowAnims.slice(0, itemCount).map((a) =>
          Animated.timing(a, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
        ),
      ).start();
      return;
    }

    const activeRowAnims = rowAnims.slice(0, menuRowCount);
    const bottomFirstOrder = [...activeRowAnims].reverse();
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
  }, [
    visible,
    anchor,
    backdropOpacity,
    rowAnims,
    popoverRowAnims,
    windowHeight,
    itemCount,
    menuRowCount,
  ]);

  if (!visible || !anchor) {
    return null;
  }

  const presentation = resolvePresentation(anchor, windowHeight);
  const isPopover = presentation === "popover";

  const menuWidth = Math.min(isPopover ? 280 : 300, windowWidth - MENU_PAD * 2);

  const navigateThenClose = (href: string) => {
    onClose();
    router.push(href as never);
  };

  if (isPopover) {
    const leftOffset = Math.max(MENU_PAD, Math.min(anchor.x, windowWidth - menuWidth - MENU_PAD));
    const menuTop = anchor.y + anchor.height + GAP_BELOW_HEADER;
    const maxMenuHeight = Math.min(
      windowHeight * 0.7,
      Math.max(200, windowHeight - menuTop - insets.bottom - 24),
    );

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
              style={[StyleSheet.absoluteFill, { backgroundColor: POPOVER_SCRIM }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={dismissAccessibilityLabel}
              testID="manage-menu-popover-scrim"
            />
          </Animated.View>

          <View
            testID={`${menuTestID}-popover`}
            style={[
              styles.menuWrap,
              {
                width: menuWidth,
                maxHeight: maxMenuHeight,
                top: menuTop,
                left: leftOffset,
                zIndex: 2,
              },
            ]}
            pointerEvents="box-none"
          >
            <View style={[styles.menuPanelPopover, { maxHeight: maxMenuHeight }]}>
              <ScrollView
                style={styles.menuScroll}
                contentContainerStyle={styles.menuScrollContentPopover}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
                nestedScrollEnabled
                bounces
              >
                {popoverRows.map((row, index) => {
                  const opacity = popoverRowAnims[index]!;
                  const translateY = opacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 0],
                  });
                  const item = row.item;
                  const rowTestID = item.testID ?? `${hubRowTestIDPrefix}-${item.id}`;

                  return (
                    <Animated.View
                      key={item.id}
                      style={{ opacity, transform: [{ translateY }] }}
                    >
                      <Pressable
                        testID={rowTestID}
                        accessibilityRole="button"
                        accessibilityLabel={item.accessibilityLabel}
                        onPress={() => navigateThenClose(item.href)}
                        style={({ pressed }) => [
                          styles.popoverRow,
                          pressed && styles.popoverRowPressed,
                        ]}
                      >
                        <ModuleIconPopover id={item.id} />
                        <Text style={styles.popoverLabel} numberOfLines={2}>
                          {item.label}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={UI_TEXT_SECONDARY} />
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

  const rightEdge = anchor.x + anchor.width;
  const rightOffset = Math.max(MENU_PAD, windowWidth - rightEdge);
  const spaceAboveFab = anchor.y - insets.top - GAP_ABOVE_FAB;
  const maxMenuHeight = Math.min(windowHeight * 0.78, Math.max(200, spaceAboveFab - 12));
  const menuBottomFromScreenBottom = windowHeight - anchor.y + GAP_ABOVE_FAB;

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
            accessibilityLabel={dismissAccessibilityLabel}
          />
        </Animated.View>

        <View
          testID={menuTestID}
          style={[
            styles.menuWrap,
            {
              width: menuWidth,
              maxHeight: maxMenuHeight,
              bottom: menuBottomFromScreenBottom,
              right: rightOffset,
              zIndex: 2,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={[styles.menuPanelFab, { maxHeight: maxMenuHeight }]}>
            <ScrollView
              style={styles.menuScroll}
              contentContainerStyle={styles.menuScrollContentFab}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              nestedScrollEnabled
              bounces
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
                        accessibilityLabel={closeRowAccessibilityLabel}
                        onPress={onClose}
                        style={({ pressed }) => [
                          styles.closeRow,
                          pressed && styles.closeRowPressed,
                        ]}
                      >
                        <View style={styles.rowClusterFab}>
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
                const rowTestID = item.testID ?? `${hubRowTestIDPrefix}-${item.id}`;

                return (
                  <Animated.View
                    key={item.id}
                    style={{ opacity, transform: [{ translateY }] }}
                  >
                    <Pressable
                      testID={rowTestID}
                      accessibilityRole="button"
                      accessibilityLabel={item.accessibilityLabel}
                      onPress={() => navigateThenClose(item.href)}
                      style={({ pressed }) => [
                        styles.moduleRowFab,
                        pressed && styles.moduleRowFabPressed,
                      ]}
                    >
                      <View style={styles.rowClusterFab}>
                        <Text style={styles.moduleLabelFab} numberOfLines={2}>
                          {item.label}
                        </Text>
                        <ModuleIconFab id={item.id} />
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

const panelShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  android: { elevation: 18 },
  default: {},
});

const popoverShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  android: { elevation: 12 },
  default: {},
});

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
  menuPanelFab: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: UI_PANEL_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_STRONG,
    ...panelShadow,
  },
  menuPanelPopover: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: UI_PANEL_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_STRONG,
    ...popoverShadow,
  },
  menuScroll: {},
  menuScrollContentFab: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    paddingBottom: 14,
    gap: 6,
    flexGrow: 1,
  },
  menuScrollContentPopover: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 2,
    flexGrow: 1,
  },
  rowClusterFab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    width: "100%",
  },
  moduleRowFab: {
    alignSelf: "stretch",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    minHeight: 52,
    justifyContent: "center",
  },
  moduleRowFabPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  moduleLabelFab: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    textAlign: "right",
    maxWidth: "72%",
  },
  popoverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    minHeight: 44,
  },
  popoverRowPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  popoverLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.1,
  },
  iconCircleFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI_SURFACE_PRESSED,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_SUBTLE,
  },
  iconCirclePopover: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
