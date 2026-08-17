import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomTabBarHeightCallbackContext } from "@react-navigation/bottom-tabs/lib/module/utils/BottomTabBarHeightCallbackContext.js";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OliBottomNav } from "@/components/navigation/OliBottomNav";
import type { ManageMenuAnchor } from "@/components/navigation/ManageMenu";
import { normalizeChromeHeight } from "@/lib/ui/navigation/normalizeChromeHeight";

/**
 * Horizontal inset for floating dock; bottom margin added to the safe-area inset.
 * The dock is offset by `insets.bottom + FLOATING_NAV_DOCK_BOTTOM_MARGIN`, so the
 * home indicator is always cleared by `insets.bottom`; the margin is only the extra
 * breathing gap above it. Kept small so the bar reads as anchored near the bottom.
 */
export const FLOATING_NAV_DOCK_H_INSET = 18;
export const FLOATING_NAV_DOCK_BOTTOM_MARGIN = 4;
/** @deprecated No detached FAB in the four-destination dock. Kept for test compatibility. */
export const FLOATING_NAV_PILL_FAB_GAP = 10;

const PILL_MIN_HEIGHT = 56;

export type FloatingNavigationChromeProps = {
  tabBarProps: BottomTabBarProps;
  manageVisible?: boolean;
  menuAnchor?: ManageMenuAnchor | null;
  openManage?: (anchor: ManageMenuAnchor) => void;
  closeManage?: () => void;
  /**
   * Stack routes: report height for `FloatingNavChromeHeightContext` / scroll padding.
   * Tab routes: omit — `BottomTabBarHeightCallbackContext` from the tab navigator is used.
   */
  onStackChromeHeightChange?: (height: number | undefined) => void;
  testID?: string;
};

/**
 * Shared floating four-destination pill.
 * Home · Plan · Progress · You — no detached fifth control.
 */
export function FloatingNavigationChrome({
  tabBarProps,
  onStackChromeHeightChange,
  testID = "oli-tab-bar-chrome",
}: FloatingNavigationChromeProps) {
  const insets = useSafeAreaInsets();
  const lastReportedHeightRef = useRef<number | undefined>(undefined);
  const onTabBarHeightFromTabs = useContext(BottomTabBarHeightCallbackContext);
  const bottomOffset = insets.bottom + FLOATING_NAV_DOCK_BOTTOM_MARGIN;
  const [navSlotHeight, setNavSlotHeight] = useState(() => bottomOffset + PILL_MIN_HEIGHT);

  const reportChromeHeight = onStackChromeHeightChange ?? onTabBarHeightFromTabs;

  const onDockRowLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const rowH = e.nativeEvent.layout.height;
      const total = normalizeChromeHeight(bottomOffset + rowH) ?? 0;
      setNavSlotHeight((current) => (current === total ? current : total));
      if (lastReportedHeightRef.current !== total) {
        lastReportedHeightRef.current = total;
        reportChromeHeight?.(total);
      }
    },
    [bottomOffset, reportChromeHeight],
  );

  useEffect(() => {
    setNavSlotHeight((h) => Math.max(h, bottomOffset + PILL_MIN_HEIGHT));
  }, [bottomOffset]);

  useEffect(() => {
    if (onStackChromeHeightChange) {
      return () => {
        lastReportedHeightRef.current = undefined;
        onStackChromeHeightChange(undefined);
      };
    }
    return undefined;
  }, [onStackChromeHeightChange]);

  return (
    <View
      testID={testID}
      pointerEvents="box-none"
      style={[
        chromeStyles.navHost,
        {
          height: navSlotHeight,
        },
      ]}
    >
      <View
        pointerEvents="box-none"
        style={[
          chromeStyles.navDockRow,
          {
            bottom: bottomOffset,
            left: FLOATING_NAV_DOCK_H_INSET,
            right: FLOATING_NAV_DOCK_H_INSET,
          },
        ]}
        onLayout={onDockRowLayout}
      >
        <OliBottomNav tabBarProps={tabBarProps} style={chromeStyles.navPillSlot} />
      </View>
    </View>
  );
}

const chromeStyles = StyleSheet.create({
  navHost: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "transparent",
  },
  navDockRow: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  navPillSlot: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "transparent",
  },
});
