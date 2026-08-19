import {
  FLOATING_NAV_DOCK_BOTTOM_MARGIN,
  FLOATING_NAV_PILL_MIN_HEIGHT,
} from "../floatingNavLayout";
import {
  FLOATING_TAB_ROOT_SCROLL_EXTRA,
  reportedFloatingChromeHeight,
  resolveFloatingTabBarScrollPadding,
} from "../useFloatingTabBarScrollPadding";

describe("resolveFloatingTabBarScrollPadding", () => {
  it("ignores overlay tab-bar height 0 and applies a minimum dock clearance", () => {
    const pad = resolveFloatingTabBarScrollPadding({
      extra: FLOATING_TAB_ROOT_SCROLL_EXTRA,
      tabBarHeight: 0,
      stackChromeHeight: undefined,
      safeAreaBottom: 34,
    });
    const minDock = 34 + FLOATING_NAV_DOCK_BOTTOM_MARGIN + FLOATING_NAV_PILL_MIN_HEIGHT;
    expect(reportedFloatingChromeHeight(0, undefined)).toBe(0);
    expect(pad).toBe(FLOATING_TAB_ROOT_SCROLL_EXTRA + minDock);
    expect(pad).toBeGreaterThan(80);
  });

  it("uses a positive reported chrome height when it exceeds the minimum dock", () => {
    const pad = resolveFloatingTabBarScrollPadding({
      extra: FLOATING_TAB_ROOT_SCROLL_EXTRA,
      tabBarHeight: 120,
      safeAreaBottom: 34,
    });
    expect(pad).toBe(FLOATING_TAB_ROOT_SCROLL_EXTRA + 120);
  });
});
