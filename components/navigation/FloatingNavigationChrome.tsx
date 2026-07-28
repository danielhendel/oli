import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomTabBarHeightCallbackContext } from "@react-navigation/bottom-tabs/lib/module/utils/BottomTabBarHeightCallbackContext.js";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { OliBottomNav } from "@/components/navigation/OliBottomNav";
import { ManageFab } from "@/components/navigation/ManageFab";
import { HealthFab } from "@/components/navigation/HealthFab";
import { ManageMenu, type ManageMenuAnchor } from "@/components/navigation/ManageMenu";
import { normalizeChromeHeight } from "@/lib/ui/navigation/normalizeChromeHeight";
import { isPrimaryNavHealthV1Enabled } from "@/lib/navigation/primaryNavHealthV1";
import { HEALTH_HUB_ITEMS } from "@/lib/navigation/healthHubItems";
import { MANAGE_HUB_ITEMS } from "@/components/navigation/manageHubItems";
import { resolvePrimaryNavActiveDestination } from "@/lib/navigation/resolvePrimaryNavActiveDestination";

/**
 * Horizontal inset for floating dock; bottom margin added to the safe-area inset.
 * The dock is offset by `insets.bottom + FLOATING_NAV_DOCK_BOTTOM_MARGIN`, so the
 * home indicator is always cleared by `insets.bottom`; the margin is only the extra
 * breathing gap above it. Kept small so the bar reads as anchored near the bottom.
 */
export const FLOATING_NAV_DOCK_H_INSET = 18;
export const FLOATING_NAV_DOCK_BOTTOM_MARGIN = 4;
/** Intentional gap between the four-item pill and the detached Health/Manage circle. */
export const FLOATING_NAV_PILL_FAB_GAP = 10;

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
 * Shared floating pill + Manage/Health circle + menu.
 * Health v1: four-item pill + detached Health circle (Manage grammar).
 * Legacy: four-tab pill + Manage FAB.
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
  const pathname = usePathname();
  const fabRef = useRef<View>(null);
  const lastReportedHeightRef = useRef<number | undefined>(undefined);
  const onTabBarHeightFromTabs = useContext(BottomTabBarHeightCallbackContext);
  const bottomOffset = insets.bottom + FLOATING_NAV_DOCK_BOTTOM_MARGIN;
  const [navSlotHeight, setNavSlotHeight] = useState(() => bottomOffset + 56);
  const healthV1 = isPrimaryNavHealthV1Enabled();
  const hubItems = healthV1 ? HEALTH_HUB_ITEMS : MANAGE_HUB_ITEMS;
  const menuTestID = healthV1 ? "oli-health-menu" : "oli-manage-menu";
  const menuA11yDismiss = healthV1 ? "Dismiss Health menu" : "Dismiss Manage menu";

  const focusedTabName = tabBarProps.state.routes[tabBarProps.state.index]?.name ?? null;
  const activeDestination = useMemo(
    () =>
      healthV1
        ? resolvePrimaryNavActiveDestination({
            pathname,
            healthMenuOpen: manageVisible,
            focusedTabName,
          })
        : null,
    [healthV1, pathname, manageVisible, focusedTabName],
  );
  const healthSelected = activeDestination === "health";

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
    setNavSlotHeight((h) => Math.max(h, bottomOffset + 56));
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

  const measureAndOpen = useCallback(() => {
    fabRef.current?.measureInWindow((x, y, width, height) => {
      openManage({ x, y, width, height, presentation: "fab" });
    });
  }, [openManage]);

  const onHealthPress = useCallback(() => {
    if (manageVisible) {
      closeManage();
      return;
    }
    measureAndOpen();
  }, [manageVisible, closeManage, measureAndOpen]);

  return (
    <>
      <ManageMenu
        visible={manageVisible}
        anchor={menuAnchor}
        onClose={closeManage}
        items={hubItems}
        menuTestID={menuTestID}
        dismissAccessibilityLabel={menuA11yDismiss}
        closeRowAccessibilityLabel={healthV1 ? "Close Health menu" : "Close"}
        hubRowTestIDPrefix={healthV1 ? "health-hub" : "manage-hub"}
      />
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
              gap: FLOATING_NAV_PILL_FAB_GAP,
            },
          ]}
          onLayout={onDockRowLayout}
        >
          <OliBottomNav
            tabBarProps={tabBarProps}
            style={chromeStyles.navPillSlot}
            healthMenuOpen={healthV1 ? manageVisible : false}
          />
          {healthV1 ? (
            <HealthFab
              ref={fabRef}
              open={manageVisible}
              selected={healthSelected}
              onPress={onHealthPress}
            />
          ) : (
            <ManageFab ref={fabRef} open={manageVisible} onPress={measureAndOpen} />
          )}
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
    backgroundColor: "transparent",
  },
  navPillSlot: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "transparent",
  },
});
