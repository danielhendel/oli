import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomTabBarHeightCallbackContext } from "@react-navigation/bottom-tabs/lib/module/utils/BottomTabBarHeightCallbackContext.js";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OliBottomNav } from "@/components/navigation/OliBottomNav";
import { ManageFab } from "@/components/navigation/ManageFab";
import { ManageMenu, type ManageMenuAnchor } from "@/components/navigation/ManageMenu";

/** Horizontal inset for floating dock; bottom margin added to safe-area inset. */
export const FLOATING_NAV_DOCK_H_INSET = 18;
export const FLOATING_NAV_DOCK_BOTTOM_MARGIN = 8;

export type FloatingNavigationChromeProps = {
  tabBarProps: BottomTabBarProps;
  manageVisible: boolean;
  menuAnchor: ManageMenuAnchor | null;
  openManage: (anchor: ManageMenuAnchor) => void;
  closeManage: () => void;
  /**
   * Stack routes: report height for `FloatingNavChromeHeightContext` / scroll padding.
   * Tab routes: omit — `BottomTabBarHeightCallbackContext` from the tab navigator is used.
   */
  onStackChromeHeightChange?: (height: number | undefined) => void;
  testID?: string;
};

/**
 * Shared floating pill + Manage FAB + menu. Used by the tab navigator custom bar and by the
 * root stack overlay on health module screens.
 */
export function FloatingNavigationChrome({
  tabBarProps,
  manageVisible,
  menuAnchor,
  openManage,
  closeManage,
  onStackChromeHeightChange,
  testID = "oli-tab-bar-chrome",
}: FloatingNavigationChromeProps) {
  const insets = useSafeAreaInsets();
  const fabRef = useRef<View>(null);
  const onTabBarHeightFromTabs = useContext(BottomTabBarHeightCallbackContext);
  const bottomOffset = insets.bottom + FLOATING_NAV_DOCK_BOTTOM_MARGIN;
  const [navSlotHeight, setNavSlotHeight] = useState(() => bottomOffset + 56);

  const reportChromeHeight = onStackChromeHeightChange ?? onTabBarHeightFromTabs;

  const onDockRowLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const rowH = e.nativeEvent.layout.height;
      const total = bottomOffset + rowH;
      setNavSlotHeight(total);
      reportChromeHeight?.(total);
    },
    [bottomOffset, reportChromeHeight],
  );

  useEffect(() => {
    setNavSlotHeight((h) => Math.max(h, bottomOffset + 56));
  }, [bottomOffset]);

  useEffect(() => {
    if (onStackChromeHeightChange) {
      return () => onStackChromeHeightChange(undefined);
    }
    return undefined;
  }, [onStackChromeHeightChange]);

  const measureAndOpen = useCallback(() => {
    fabRef.current?.measureInWindow((x, y, width, height) => {
      openManage({ x, y, width, height });
    });
  }, [openManage]);

  return (
    <>
      <ManageMenu visible={manageVisible} anchor={menuAnchor} onClose={closeManage} />
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
          <ManageFab ref={fabRef} open={manageVisible} onPress={measureAndOpen} />
        </View>
      </View>
    </>
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
    gap: 10,
    backgroundColor: "transparent",
  },
  navPillSlot: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "transparent",
  },
});
