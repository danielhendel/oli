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
import { CommonActions } from "@react-navigation/native";
import {
<<<<<<< HEAD
  UI_NAV_SURFACE,
  UI_NAV_SURFACE_BORDER,
=======
  UI_BORDER_SUBTLE,
>>>>>>> origin/main
  UI_NAV_SURFACE_ACTIVE,
  UI_NAV_TAB_ICON_ACTIVE,
  UI_NAV_TAB_ICON_INACTIVE,
} from "@/lib/ui/theme/uiTokens";

const MAIN_TAB_ORDER = ["dash", "timeline", "library", "profile"] as const;

const ACTIVE = UI_NAV_TAB_ICON_ACTIVE;
const INACTIVE = UI_NAV_TAB_ICON_INACTIVE;

/** Min tap target ~44pt (Apple HIG); compact vertical layout inside pill. */
const TAB_MIN_HEIGHT = 44;

export type OliBottomNavProps = {
  tabBarProps: BottomTabBarProps;
  style?: StyleProp<ViewStyle>;
};

export function OliBottomNav({ tabBarProps, style }: OliBottomNavProps) {
  const { state, descriptors, navigation } = tabBarProps;

  const routesInOrder = useMemo(() => {
    return MAIN_TAB_ORDER.map((name) => state.routes.find((r) => r.name === name)).filter(
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

const styles = StyleSheet.create({
  /** Layout slot only — no shadow (shadow on full flex width reads as a bottom band). */
  outer: {
    backgroundColor: "transparent",
  },
  pill: {
    minHeight: TAB_MIN_HEIGHT + 12,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "rgba(18,22,27,0.96)",
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
