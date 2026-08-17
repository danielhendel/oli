import React, { useMemo } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import {
  UI_NAV_DOCK_SURFACE,
  UI_NAV_SURFACE_BORDER,
  UI_NAV_SURFACE_ACTIVE,
  UI_NAV_TAB_ICON_ACTIVE,
  UI_NAV_TAB_ICON_INACTIVE,
} from "@/lib/ui/theme/uiTokens";
import { PRIMARY_NAVIGATION_ITEMS } from "@/lib/navigation/primaryNavigationConfig";
import { resolvePrimaryNavActiveDestination } from "@/lib/navigation/resolvePrimaryNavActiveDestination";
import { navigatePrimaryDestination } from "@/lib/navigation/navigatePrimaryDestination";

const ACTIVE = UI_NAV_TAB_ICON_ACTIVE;
const INACTIVE = UI_NAV_TAB_ICON_INACTIVE;

/** Min tap target ~44pt (Apple HIG); compact vertical layout inside pill. */
const TAB_MIN_HEIGHT = 44;

export type OliBottomNavProps = {
  tabBarProps: BottomTabBarProps;
  style?: StyleProp<ViewStyle>;
  /**
   * @deprecated Health menu is not a primary destination. Ignored.
   */
  healthMenuOpen?: boolean;
};

/**
 * Primary dock pill: Home · Plan · Progress · You.
 */
export function OliBottomNav({ tabBarProps, style }: OliBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const focusedTabName = tabBarProps.state.routes[tabBarProps.state.index]?.name ?? null;

  const activeDestination = useMemo(
    () =>
      resolvePrimaryNavActiveDestination({
        pathname,
        focusedTabName,
      }),
    [pathname, focusedTabName],
  );

  return (
    <View
      style={[styles.outer, style]}
      accessibilityRole="tablist"
      pointerEvents="box-none"
      testID="oli-primary-nav-pill"
    >
      <View style={styles.pill}>
        <View style={styles.rowPill}>
          {PRIMARY_NAVIGATION_ITEMS.map((item) => {
            const isFocused = activeDestination === item.id;
            const color = isFocused ? ACTIVE : INACTIVE;
            const iconName = isFocused ? item.icon : item.iconOutline;

            return (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityLabel={item.accessibilityLabel}
                accessibilityHint={item.accessibilityHint}
                accessibilityState={{ selected: isFocused }}
                testID={item.testID}
                onPress={() => {
                  navigatePrimaryDestination({
                    item,
                    activeDestination,
                    pathname,
                    router,
                    tabBarProps,
                  });
                }}
                style={({ pressed }) => [
                  styles.tab,
                  isFocused && styles.tabFocused,
                  pressed && styles.tabPressed,
                ]}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={iconName} size={22} color={color} />
                </View>
                <Text style={[styles.label, { color }]} numberOfLines={1}>
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
  rowPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 2,
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
});
