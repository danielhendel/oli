import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildOverlayTabBarProps } from "@/components/navigation/buildOverlayTabBarProps";
import { FloatingNavigationChrome } from "@/components/navigation/FloatingNavigationChrome";
import { shouldShowStackFloatingNavForPathname } from "@/components/navigation/stackFloatingNavVisibility";
import type { ManageMenuAnchor } from "@/components/navigation/ManageMenu";

type OliFloatingNavigationHostProps = {
  onStackChromeHeightChange: (height: number | undefined) => void;
};

/**
 * Root-stack overlay: same floating pill + Manage as `(tabs)/_layout`, for health module routes
 * where the tab navigator is not mounted.
 */
export function OliFloatingNavigationHost({
  onStackChromeHeightChange,
}: OliFloatingNavigationHostProps) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const show = shouldShowStackFloatingNavForPathname(pathname);

  const [manageVisible, setManageVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<ManageMenuAnchor | null>(null);

  const openManage = useCallback((anchor: ManageMenuAnchor) => {
    setMenuAnchor(anchor);
    setManageVisible(true);
  }, []);

  const closeManage = useCallback(() => {
    setManageVisible(false);
    setMenuAnchor(null);
  }, []);

  const tabBarProps = useMemo(
    () => buildOverlayTabBarProps(router, insets),
    [router, insets],
  );

  useEffect(() => {
    if (!show) {
      setManageVisible(false);
      setMenuAnchor(null);
      onStackChromeHeightChange(undefined);
    }
  }, [show, onStackChromeHeightChange]);

  if (!show) {
    return null;
  }

  return (
    <FloatingNavigationChrome
      tabBarProps={tabBarProps}
      manageVisible={manageVisible}
      menuAnchor={menuAnchor}
      openManage={openManage}
      closeManage={closeManage}
      onStackChromeHeightChange={onStackChromeHeightChange}
      testID="oli-stack-floating-nav"
    />
  );
}
