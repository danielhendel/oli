jest.mock("@react-navigation/native", () => ({
  CommonActions: {
    navigate: jest.fn((opts: { name: string; merge?: boolean; params?: object }) => ({
      type: "NAVIGATE",
      payload: opts,
    })),
  },
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Modal: "Modal",
  ScrollView: "ScrollView",
  Animated: {
    View: "Animated.View",
    Value: function Value() {
      return {
        setValue: jest.fn(),
        interpolate: () => 0,
      };
    },
    timing: () => ({
      start: (cb?: (r: { finished: boolean }) => void) => {
        if (typeof cb === "function") cb({ finished: true });
      },
    }),
    spring: () => ({
      start: (cb?: (r: { finished: boolean }) => void) => {
        if (typeof cb === "function") cb({ finished: true });
      },
    }),
    stagger: () => ({
      start: (cb?: (r: { finished: boolean }) => void) => {
        if (typeof cb === "function") cb({ finished: true });
      },
    }),
  },
  Platform: {
    OS: "ios",
    select: <T,>(s: { ios?: T; android?: T; default?: T }) => s.ios ?? s.default,
  },
  StyleSheet: {
    create: (s: unknown) => s,
    absoluteFill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
    absoluteFillObject: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  },
  useWindowDimensions: () => ({ width: 400, height: 800, scale: 2, fontScale: 1 }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 20, left: 0, right: 0 }),
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/dash",
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

import React, { act } from "react";
import renderer from "react-test-renderer";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { OliBottomNav } from "@/components/navigation/OliBottomNav";
import { ManageFab } from "@/components/navigation/ManageFab";
import { ManageMenu } from "@/components/navigation/ManageMenu";
import { MANAGE_HUB_ITEMS } from "@/components/navigation/manageHubItems";
import { HEALTH_HUB_ITEMS } from "@/lib/navigation/healthHubItems";
import { setPrimaryNavHealthV1EnabledForTests } from "@/lib/navigation/primaryNavHealthV1";
import { PRIMARY_PILL_ITEMS } from "@/lib/navigation/primaryNavigationConfig";
import { HealthFab, HEALTH_FAB_MIN_HEIGHT, HEALTH_FAB_MIN_WIDTH } from "@/components/navigation/HealthFab";
import {
  FloatingNavigationChrome,
  FLOATING_NAV_PILL_FAB_GAP,
} from "@/components/navigation/FloatingNavigationChrome";

const TEST_ANCHOR = { x: 300, y: 680, width: 52, height: 52 };

function buildTabBarProps(focusedRouteIndex: number): BottomTabBarProps {
  const routes = [
    { key: "dash-k", name: "dash" },
    { key: "program-k", name: "program" },
    { key: "progress-k", name: "progress" },
    { key: "you-k", name: "you" },
  ];
  const titles: Record<string, string> = {
    dash: "Home",
    program: "Plan",
    progress: "Progress",
    you: "You",
  };
  const descriptors = Object.fromEntries(
    routes.map((r) => [
      r.key,
      {
        options: {
          title: titles[r.name],
          tabBarAccessibilityLabel: titles[r.name],
          tabBarIcon: () => null,
        },
        navigation: {},
        render: () => null,
      },
    ]),
  );
  return {
    state: {
      key: "tabs",
      index: focusedRouteIndex,
      routeNames: routes.map((x) => x.name),
      routes,
      type: "tab",
      stale: false,
      history: [],
      preloadedRouteKeys: [],
    },
    descriptors,
    navigation: {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      dispatch: jest.fn(),
    },
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  };
}

describe("Oli bottom navigation", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    setPrimaryNavHealthV1EnabledForTests(false);
  });

  afterEach(() => {
    setPrimaryNavHealthV1EnabledForTests(null);
  });

  it("renders four primary tabs (Home, Plan, Progress, You)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={buildTabBarProps(0)} />);
    });
    const ids = ["home", "plan", "progress", "you"].map((n) => `oli-tab-${n}`);
    for (const id of ids) {
      test.root.findByProps({ testID: id });
    }
    expect(() => test.root.findByProps({ testID: "oli-tab-dash" })).toThrow();
    expect(() => test.root.findByProps({ testID: "oli-tab-strength" })).toThrow();
  });

  it("does not render Profile as a bottom nav item", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={buildTabBarProps(0)} />);
    });
    expect(() => test.root.findByProps({ testID: "oli-tab-profile" })).toThrow();
  });

  it("dispatches navigation to the Program route when the Plan tab is pressed", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CommonActions } = require("@react-navigation/native");
    CommonActions.navigate.mockClear();
    const props = buildTabBarProps(0);
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={props} />);
    });
    const planTab = test.root.findByProps({ testID: "oli-tab-plan" });
    act(() => {
      planTab.props.onPress();
    });
    expect(props.navigation.dispatch).toHaveBeenCalled();
    expect(CommonActions.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "program" }),
    );
  });

  it("uses calendar-ring blue for the active tab and white for inactive tabs", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={buildTabBarProps(2)} />);
    });
    const json = JSON.stringify(test.toJSON());
    expect(json).toContain(SYSTEM_ACCENT);
    expect(json).toContain("#FFFFFF");
  });

  it("uses the solid nav dock surface token for the pill background (separated from page/cards, not transparent, not the old dark literal)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={buildTabBarProps(0)} />);
    });
    const json = JSON.stringify(test.toJSON());
    expect(json).toContain("rgba(48,56,66,0.88)");
    expect(json).not.toContain("rgba(18,22,27,0.96)");
  });

  it("renders the Manage FAB on the same dock surface token as the pill (one unified dock)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<ManageFab onPress={jest.fn()} />);
    });
    const fab = test.root.findByProps({ testID: "oli-manage-fab" });
    const styleProp = fab.props.style as unknown;
    const resolved =
      typeof styleProp === "function"
        ? (styleProp as (s: { pressed: boolean }) => unknown)({ pressed: false })
        : styleProp;
    const flat = Array.isArray(resolved)
      ? Object.assign(
          {},
          ...resolved.filter((s): s is Record<string, unknown> => typeof s === "object" && s != null),
        )
      : (resolved as Record<string, unknown>);
    // Same dock token as the pill — no longer the opaque card/elevated surface (#181D23)
    // that read as a separate darker circle.
    expect(flat.backgroundColor).toBe("rgba(48,56,66,0.88)");
    expect(flat.backgroundColor).not.toBe("#181D23");
  });

  it("does not render unsupported Expo blur views (premium translucent pill only)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={buildTabBarProps(0)} />);
    });
    const json = JSON.stringify(test.toJSON());
    expect(json).not.toMatch(/ExpoBlur|BlurView|ViewManagerAdapter/);
  });

  it("marks the active tab as selected when that tab is focused", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={buildTabBarProps(2)} />);
    });
    const progressTab = test.root.findByProps({ testID: "oli-tab-progress" });
    expect(progressTab.props.accessibilityState.selected).toBe(true);
    const homeTab = test.root.findByProps({ testID: "oli-tab-home" });
    expect(homeTab.props.accessibilityState.selected).toBe(false);
  });

  it("selects Home when the Dash filesystem tab is focused", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={buildTabBarProps(0)} />);
    });
    expect(test.root.findByProps({ testID: "oli-tab-home" }).props.accessibilityState.selected).toBe(
      true,
    );
    for (const id of ["plan", "progress", "you"]) {
      expect(test.root.findByProps({ testID: `oli-tab-${id}` }).props.accessibilityState.selected).toBe(
        false,
      );
    }
  });

  it("renders Manage FAB with expected accessibility label", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<ManageFab onPress={jest.fn()} />);
    });
    const fab = test.root.findByProps({ testID: "oli-manage-fab" });
    expect(fab.props.accessibilityLabel).toBe("Open Manage menu");
  });

  it("renders anchored manage menu with all module rows when visible (not full-screen sheet)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ManageMenu visible anchor={TEST_ANCHOR} onClose={jest.fn()} />,
      );
    });
    test.root.findByProps({ testID: "oli-manage-menu" });
    const modal = test.root.findByType("Modal" as unknown as React.ElementType);
    expect(modal.props.animationType).not.toBe("slide");

    for (const item of MANAGE_HUB_ITEMS) {
      test.root.findByProps({ testID: `manage-hub-${item.id}` });
    }
    expect(MANAGE_HUB_ITEMS.length).toBe(9);
  });

  it("lists Manage categories in the required order with Profile first", () => {
    expect(MANAGE_HUB_ITEMS.map((x) => x.id)).toEqual([
      "profile",
      "body",
      "activity",
      "strength",
      "cardio",
      "nutrition",
      "sleep",
      "recovery",
      "labs",
    ]);
  });

  it("places Profile as the first actionable item above Body Composition", () => {
    expect(MANAGE_HUB_ITEMS[0]?.id).toBe("profile");
    expect(MANAGE_HUB_ITEMS[1]?.id).toBe("body");
  });

  it("navigates to the existing Profile screen when the Profile row is pressed", () => {
    const onClose = jest.fn();
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ManageMenu visible anchor={TEST_ANCHOR} onClose={onClose} />,
      );
    });
    const profileRow = test.root.findByProps({ testID: "manage-hub-profile" });
    act(() => {
      profileRow.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/(tabs)/profile");
    expect(onClose).toHaveBeenCalled();
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
      mockPush.mock.invocationCallOrder[0]!,
    );
  });

  it("renders category label text beside icons (compact row cluster, not full-width left)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ManageMenu visible anchor={TEST_ANCHOR} onClose={jest.fn()} />,
      );
    });
    test.root.findByProps({ testID: "manage-hub-body" });
    const flat = JSON.stringify(test.toJSON());
    expect(flat).toContain("Body Composition");
  });

  it("does not surface Coming soon copy for DNA in the menu tree", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ManageMenu visible anchor={TEST_ANCHOR} onClose={jest.fn()} />,
      );
    });
    const json = JSON.stringify(test.toJSON());
    expect(json).not.toMatch(/Coming soon/i);
  });

  it("navigates and closes when a module row is pressed", () => {
    const onClose = jest.fn();
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ManageMenu visible anchor={TEST_ANCHOR} onClose={onClose} />,
      );
    });
    const bodyRow = test.root.findByProps({ testID: "manage-hub-body" });
    act(() => {
      bodyRow.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/body");
    expect(onClose).toHaveBeenCalled();
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
      mockPush.mock.invocationCallOrder[0]!,
    );
  });

  it("does not expose DNA as a launch-facing Manage destination", () => {
    expect(MANAGE_HUB_ITEMS.some((item) => item.id === "dna")).toBe(false);
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ManageMenu visible anchor={TEST_ANCHOR} onClose={jest.fn()} />,
      );
    });
    expect(() => test.root.findByProps({ testID: "manage-hub-dna" })).toThrow();
  });

  it("closes when the full-screen overlay is tapped", () => {
    const onClose = jest.fn();
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ManageMenu visible anchor={TEST_ANCHOR} onClose={onClose} />,
      );
    });
    const dismiss = test.root.findByProps({
      accessibilityLabel: "Dismiss Manage menu",
    });
    act(() => {
      dismiss.props.onPress();
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when Close is pressed", () => {
    const onClose = jest.fn();
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ManageMenu visible anchor={TEST_ANCHOR} onClose={onClose} />,
      );
    });
    const closeBtn = test.root.findByProps({ testID: "manage-menu-close" });
    act(() => {
      closeBtn.props.onPress();
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("opens the manage menu modal when visible with anchor (FAB-driven flow)", () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <ManageFab onPress={() => setOpen(true)} />
          <ManageMenu
            visible={open}
            anchor={open ? TEST_ANCHOR : null}
            onClose={() => setOpen(false)}
          />
        </>
      );
    }
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<Harness />);
    });
    expect(
      test.root.findAll((n) => (n as { type?: unknown }).type === "Modal").length,
    ).toBe(0);
    act(() => {
      test.root.findByProps({ testID: "oli-manage-fab" }).props.onPress();
    });
    const modal = test.root.findByType("Modal" as unknown as React.ElementType);
    expect(modal.props.visible).toBe(true);
    test.root.findByProps({ testID: "oli-manage-menu" });
  });
});

describe("Phase 2G-A health primary navigation", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    setPrimaryNavHealthV1EnabledForTests(true);
  });

  afterEach(() => {
    setPrimaryNavHealthV1EnabledForTests(null);
  });

  it("renders a four-item pill without Health inside", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={buildTabBarProps(0)} />);
    });
    test.root.findByProps({ testID: "oli-primary-nav-pill" });
    for (const item of PRIMARY_PILL_ITEMS) {
      const tab = test.root.findByProps({ testID: item.testID });
      expect(tab.props.accessibilityRole).toBe("tab");
    }
    expect(() => test.root.findByProps({ testID: "oli-health-fab" })).toThrow();
    expect(() => test.root.findByProps({ testID: "oli-tab-health" })).toThrow();
    for (const forbidden of ["timeline", "program", "library", "manage"]) {
      expect(() => test.root.findByProps({ testID: `oli-tab-${forbidden}` })).toThrow();
    }
  });

  it("keeps Home selected while an ignored healthMenuOpen flag is set", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <OliBottomNav tabBarProps={buildTabBarProps(0)} healthMenuOpen />,
      );
    });
    const home = test.root.findByProps({ testID: "oli-tab-home" });
    expect(home.props.accessibilityState.selected).toBe(true);
    for (const id of ["plan", "progress", "you"]) {
      expect(test.root.findByProps({ testID: `oli-tab-${id}` }).props.accessibilityState.selected).toBe(
        false,
      );
    }
  });

  it("contains Health icon and label inside one pressable surface", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<HealthFab onPress={jest.fn()} />);
    });
    const fab = test.root.findByProps({ testID: "oli-health-fab" });
    expect(fab.props.accessibilityRole).toBe("button");
    expect(fab.props.accessibilityLabel).toBe("Health");
    expect(fab.props.accessibilityHint).toContain("Health menu");
    expect(fab.props.accessibilityState.expanded).toBe(false);

    // Icon + label are descendants of the same pressable (not a circle-only sibling layout).
    const icon = fab.findByProps({ testID: "oli-health-fab-icon" });
    const label = fab.findByProps({ testID: "oli-health-fab-label" });
    expect(label.children).toContain("Health");
    expect(icon).toBeTruthy();

    // Surface styles live on the pressable itself (contained control).
    const styleProp = fab.props.style as unknown;
    const resolved =
      typeof styleProp === "function"
        ? (styleProp as (s: { pressed: boolean }) => unknown)({ pressed: false })
        : styleProp;
    const flat = Array.isArray(resolved)
      ? Object.assign(
          {},
          ...resolved.filter((s): s is Record<string, unknown> => typeof s === "object" && s != null),
        )
      : (resolved as Record<string, unknown>);
    expect(flat.minHeight).toBe(HEALTH_FAB_MIN_HEIGHT);
    expect(flat.minWidth).toBe(HEALTH_FAB_MIN_WIDTH);
    expect(flat.minHeight).toBeGreaterThanOrEqual(44);
    expect(flat.overflow).toBe("hidden");
    expect(flat.borderRadius).toBe(26);
    // No separate outer circle surface that excludes the label.
    expect(() => fab.findByProps({ testID: "oli-health-fab-circle" })).toThrow();
  });

  it("marks Health FAB selected/expanded while menu is open", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<HealthFab onPress={jest.fn()} open selected />);
    });
    const fab = test.root.findByProps({ testID: "oli-health-fab" });
    expect(fab.props.accessibilityState.selected).toBe(true);
    expect(fab.props.accessibilityState.expanded).toBe(true);
  });

  it("aligns Health control height with the primary pill (56pt)", () => {
    expect(HEALTH_FAB_MIN_HEIGHT).toBe(56);
    expect(FLOATING_NAV_PILL_FAB_GAP).toBe(10);
  });

  it("chrome renders the four-item pill with no detached FAB", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <FloatingNavigationChrome
          tabBarProps={buildTabBarProps(0)}
        />,
      );
    });
    test.root.findByProps({ testID: "oli-primary-nav-pill" });
    expect(() => test.root.findByProps({ testID: "oli-health-fab" })).toThrow();
    expect(() => test.root.findByProps({ testID: "oli-manage-fab" })).toThrow();
    for (const item of PRIMARY_PILL_ITEMS) {
      test.root.findByProps({ testID: item.testID });
    }
  });

  it("chrome press on a primary tab does not require a Health menu callback", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <FloatingNavigationChrome
          tabBarProps={buildTabBarProps(0)}
        />,
      );
    });
    act(() => {
      test.root.findByProps({ testID: "oli-tab-you" }).props.onPress();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("renders Health menu rows in product order and excludes fitness items", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ManageMenu
          visible
          anchor={TEST_ANCHOR}
          onClose={jest.fn()}
          items={HEALTH_HUB_ITEMS}
          menuTestID="oli-health-menu"
          hubRowTestIDPrefix="health-hub"
        />,
      );
    });
    test.root.findByProps({ testID: "oli-health-menu" });
    for (const item of HEALTH_HUB_ITEMS) {
      test.root.findByProps({ testID: item.testID });
    }
    expect(() => test.root.findByProps({ testID: "health-hub-strength" })).toThrow();
    expect(() => test.root.findByProps({ testID: "health-hub-dna" })).toThrow();
    const flat = JSON.stringify(test.toJSON());
    expect(flat).toContain("Close");
    expect(flat).toContain("Movement");
    expect(flat).not.toContain("DNA");
    expect(flat).not.toContain("Medical History");
  });

  it("closes Health menu before navigating", () => {
    const onClose = jest.fn();
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ManageMenu
          visible
          anchor={TEST_ANCHOR}
          onClose={onClose}
          items={HEALTH_HUB_ITEMS}
          menuTestID="oli-health-menu"
        />,
      );
    });
    const labs = test.root.findByProps({ testID: "health-hub-labs" });
    act(() => {
      labs.props.onPress();
    });
    expect(onClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/(app)/labs");
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(mockPush.mock.invocationCallOrder[0]!);
  });

  it("dismisses Health menu via Close and Android back (onRequestClose)", () => {
    const onClose = jest.fn();
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ManageMenu
          visible
          anchor={TEST_ANCHOR}
          onClose={onClose}
          items={HEALTH_HUB_ITEMS}
          menuTestID="oli-health-menu"
          closeRowAccessibilityLabel="Close Health menu"
        />,
      );
    });
    act(() => {
      test.root.findByProps({ testID: "manage-menu-close" }).props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    const modal = test.root.findByType("Modal" as unknown as React.ElementType);
    act(() => {
      modal.props.onRequestClose();
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("deprecated health-nav flag does not restore a fifth destination", () => {
  afterEach(() => {
    setPrimaryNavHealthV1EnabledForTests(null);
  });

  it("EXPO_PUBLIC_PRIMARY_NAV_HEALTH_V1=0 still renders Home Plan Progress You with no FAB", () => {
    setPrimaryNavHealthV1EnabledForTests(false);
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <FloatingNavigationChrome
          tabBarProps={buildTabBarProps(0)}
        />,
      );
    });
    for (const id of ["home", "plan", "progress", "you"]) {
      test.root.findByProps({ testID: `oli-tab-${id}` });
    }
    test.root.findByProps({ testID: "oli-primary-nav-pill" });
    expect(() => test.root.findByProps({ testID: "oli-manage-fab" })).toThrow();
    expect(() => test.root.findByProps({ testID: "oli-health-fab" })).toThrow();
    for (const id of ["strength", "cardio", "nutrition", "timeline", "library"]) {
      expect(() => test.root.findByProps({ testID: `oli-tab-${id}` })).toThrow();
    }
  });
});
