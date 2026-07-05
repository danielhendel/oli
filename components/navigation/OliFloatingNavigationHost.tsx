import React, { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildOverlayTabBarProps } from "@/components/navigation/buildOverlayTabBarProps";
import { FloatingNavigationChrome } from "@/components/navigation/FloatingNavigationChrome";
import { shouldShowStackFloatingNavForPathname } from "@/components/navigation/stackFloatingNavVisibility";

type OliFloatingNavigationHostProps = {
  onStackChromeHeightChange: (height: number | undefined) => void;
};

/**
 * Root-stack overlay: same floating pill + Profile shortcut as `(tabs)/_layout`, for health
 * module routes where the tab navigator is not mounted.
 */
export function OliFloatingNavigationHost({
  onStackChromeHeightChange,
}: OliFloatingNavigationHostProps) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const show = shouldShowStackFloatingNavForPathname(pathname);

  const tabBarProps = useMemo(
    () => buildOverlayTabBarProps(router, insets),
    [router, insets],
  );
  const closeManage = useCallback(() => undefined, []);

  useEffect(() => {
    if (!show) {
      onStackChromeHeightChange(undefined);
    }
  }, [show, onStackChromeHeightChange]);

  if (!show) {
    return null;
  }

  return (
    <FloatingNavigationChrome
      tabBarProps={tabBarProps}
      manageVisible={false}
      menuAnchor={null}
      closeManage={closeManage}
      onStackChromeHeightChange={onStackChromeHeightChange}
      testID="oli-stack-floating-nav"
    />
  );
}
