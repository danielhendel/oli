import React, { useMemo, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import {
  UI_NAV_DOCK_SURFACE,
  UI_NAV_SURFACE_BORDER,
  UI_NAV_SURFACE_ACTIVE,
  UI_NAV_TAB_ICON_ACTIVE,
  UI_NAV_TAB_ICON_INACTIVE,
} from "@/lib/ui/theme/uiTokens";
import { isPrimaryNavHealthV1Enabled } from "@/lib/navigation/primaryNavHealthV1";
import {
  PRIMARY_NAVIGATION_ITEMS,
  type PrimaryNavigationDestination,
} from "@/lib/navigation/primaryNavigationConfig";
import { resolvePrimaryNavActiveDestination } from "@/lib/navigation/resolvePrimaryNavActiveDestination";
import { navigatePrimaryDestination } from "@/lib/navigation/navigatePrimaryDestination";
import type { ManageMenuAnchor } from "@/components/navigation/ManageMenu";

const LEGACY_TAB_ORDER = ["dash", "timeline", "program", "library"] as const;

const ACTIVE = UI_NAV_TAB_ICON_ACTIVE;
const INACTIVE = UI_NAV_TAB_ICON_INACTIVE;

/** Min tap target ~44pt (Apple HIG); compact vertical layout inside pill. */
const TAB_MIN_HEIGHT = 44;

export type OliBottomNavProps = {
  tabBarProps: BottomTabBarProps;
  style?: StyleProp<ViewStyle>;
  /** When true, Health destination appears selected (menu open). */
  healthMenuOpen?: boolean;
  /** Opens the Health menu anchored to the Health tab. */
  onOpenHealthMenu?: (anchor: ManageMenuAnchor) => void;
  /** When the Health menu is already open, dismiss it. */
  onCloseHealthMenu?: () => void;
};

export function OliBottomNav({
  tabBarProps,
  style,
  healthMenuOpen = false,
  onOpenHealthMenu,
  onCloseHealthMenu,
}: OliBottomNavProps) {
  const healthV1 = isPrimaryNavHealthV1Enabled();
  if (healthV1) {
    return (
      <HealthPrimaryBottomNav
        tabBarProps={tabBarProps}
        style={style}
        healthMenuOpen={healthMenuOpen}
        {...(onOpenHealthMenu ? { onOpenHealthMenu } : {})}
        {...(onCloseHealthMenu ? { onCloseHealthMenu } : {})}
      />
    );
  }
  return <LegacyBottomNav tabBarProps={tabBarProps} style={style} />;
}

function LegacyBottomNav({
  tabBarProps,
  style,
}: {
  tabBarProps: BottomTabBarProps;
  style?: StyleProp<ViewStyle>;
}) {
  const { state, descriptors, navigation } = tabBarProps;

  const routesInOrder = useMemo(() => {
    return LEGACY_TAB_ORDER.map((name) => state.routes.find((r) => r.name === name)).filter(
      (r): r is (typeof state.routes)[number] => r != null,
    );
  }, [state.routes]);

  const focusedRoute = state.routes[state.index];
  const focusedName = focusedRoute?.name;

  return (
    <View style={[styles.outer, style]} accessibilityRole="tablist" pointerEvents="box-none">
      <View style={styles.pill}>
        <View style={styles.row}>
          {routesInOrder.map((route) => {
            const descriptor = descriptors[route.key];
            if (!descriptor) {
              return null;
            }
            const { options } = descriptor;
            const labelText =
              typeof options.title === "string" && options.title.length > 0
                ? options.title
                : typeof options.tabBarLabel === "string"
                  ? options.tabBarLabel
                  : route.name;

            const isFocused = focusedName === route.name && focusedName !== "manage";
            const color = isFocused ? ACTIVE : INACTIVE;
            const iconRenderer = options.tabBarIcon;
            const a11yLabel =
              (options.tabBarAccessibilityLabel as string | undefined) ?? labelText;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              const alreadyFocused = focusedName === route.name;
              if (!alreadyFocused && !event.defaultPrevented) {
                const navAction = CommonActions.navigate({
                  name: route.name,
                  merge: true,
                  ...(route.params !== undefined ? { params: route.params as object } : {}),
                });
                navigation.dispatch(
                  Object.assign(navAction, { target: state.key }) as Parameters<
                    typeof navigation.dispatch
                  >[0],
                );
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={typeof a11yLabel === "string" ? a11yLabel : route.name}
                accessibilityState={{ selected: isFocused }}
                testID={`oli-tab-${route.name}`}
                onPress={onPress}
                onLongPress={onLongPress}
                style={({ pressed }) => [
                  styles.tab,
                  isFocused && styles.tabFocused,
                  pressed && styles.tabPressed,
                ]}
              >
                <View style={styles.iconWrap}>
                  {iconRenderer
                    ? iconRenderer({
                        focused: isFocused,
                        color,
                        size: 22,
                      })
                    : null}
                </View>
                <Text style={[styles.label, { color }]} numberOfLines={1}>
                  {labelText}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function HealthPrimaryBottomNav({
  tabBarProps,
  style,
  healthMenuOpen,
  onOpenHealthMenu,
  onCloseHealthMenu,
}: {
  tabBarProps: BottomTabBarProps;
  style?: StyleProp<ViewStyle>;
  healthMenuOpen: boolean;
  onOpenHealthMenu?: (anchor: ManageMenuAnchor) => void;
  onCloseHealthMenu?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const focusedTabName = tabBarProps.state.routes[tabBarProps.state.index]?.name ?? null;
  const healthTabRef = useRef<View>(null);

  const activeDestination: PrimaryNavigationDestination | null = resolvePrimaryNavActiveDestination({
    pathname,
    healthMenuOpen,
    focusedTabName,
  });

  return (
    <View style={[styles.outer, style]} accessibilityRole="tablist" pointerEvents="box-none">
      <View style={styles.pill}>
        <View style={styles.rowHealth}>
          {PRIMARY_NAVIGATION_ITEMS.map((item) => {
            const isFocused = activeDestination === item.id;
            const color = isFocused ? ACTIVE : INACTIVE;
            const iconName = isFocused ? item.icon : item.iconOutline;

            const onPress = () => {
              if (item.action.kind === "menu") {
                if (healthMenuOpen) {
                  onCloseHealthMenu?.();
                  return;
                }
                healthTabRef.current?.measureInWindow((x, y, width, height) => {
                  onOpenHealthMenu?.({ x, y, width, height, presentation: "fab" });
                });
                return;
              }

              navigatePrimaryDestination({
                item,
                activeDestination,
                pathname,
                router,
                tabBarProps,
              });
            };

            if (item.id === "health") {
              return (
                <View
                  key={item.id}
                  ref={healthTabRef}
                  collapsable={false}
                  style={styles.healthTabMeasure}
                >
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityLabel={item.accessibilityLabel}
                    accessibilityHint={item.accessibilityHint}
                    accessibilityState={{ selected: isFocused, expanded: healthMenuOpen }}
                    testID={item.testID}
                    onPress={onPress}
                    style={({ pressed }) => [
                      styles.tab,
                      styles.tabHealth,
                      isFocused && styles.tabFocused,
                      pressed && styles.tabPressed,
                    ]}
                  >
                    <View style={styles.iconWrap}>
                      <Ionicons name={iconName} size={20} color={color} />
                    </View>
                    <Text style={[styles.labelHealth, { color }]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </Pressable>
                </View>
              );
            }

            return (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityLabel={item.accessibilityLabel}
                accessibilityHint={item.accessibilityHint}
                accessibilityState={{ selected: isFocused }}
                testID={item.testID}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.tab,
                  styles.tabHealth,
                  isFocused && styles.tabFocused,
                  pressed && styles.tabPressed,
                ]}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={iconName} size={20} color={color} />
                </View>
                <Text style={[styles.labelHealth, { color }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Layout slot only — no shadow (shadow on full flex width reads as a bottom band). */
  outer: {
    backgroundColor: "transparent",
  },
  pill: {
    minHeight: TAB_MIN_HEIGHT + 12,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: UI_NAV_DOCK_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_NAV_SURFACE_BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 2,
  },
  rowHealth: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 0,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: TAB_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    borderRadius: 20,
    gap: 3,
  },
  tabHealth: {
    paddingHorizontal: 1,
    gap: 2,
  },
  healthTabMeasure: {
    flex: 1,
    minWidth: 0,
  },
  tabFocused: {
    backgroundColor: UI_NAV_SURFACE_ACTIVE,
  },
  tabPressed: {
    opacity: 0.88,
  },
  iconWrap: {
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  labelHealth: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
