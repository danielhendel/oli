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
    { key: "timeline-k", name: "timeline" },
    { key: "program-k", name: "program" },
    { key: "library-k", name: "library" },
    { key: "manage-k", name: "manage" },
  ];
  const titles: Record<string, string> = {
    dash: "Dash",
    timeline: "Timeline",
    program: "Program",
    library: "Library",
    manage: "Manage",
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

  it("renders four main tabs (Dash, Timeline, Program, Library)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={buildTabBarProps(0)} />);
    });
    const ids = ["dash", "timeline", "program", "library"].map((n) => `oli-tab-${n}`);
    for (const id of ids) {
      test.root.findByProps({ testID: id });
    }
  });

  it("does not render Profile as a bottom nav item", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={buildTabBarProps(0)} />);
    });
    expect(() => test.root.findByProps({ testID: "oli-tab-profile" })).toThrow();
  });

  it("dispatches navigation to the Program route when the Program tab is pressed", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CommonActions } = require("@react-navigation/native");
    CommonActions.navigate.mockClear();
    const props = buildTabBarProps(0);
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={props} />);
    });
    const programTab = test.root.findByProps({ testID: "oli-tab-program" });
    act(() => {
      programTab.props.onPress();
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
      test = renderer.create(<OliBottomNav tabBarProps={buildTabBarProps(3)} />);
    });
    const libraryTab = test.root.findByProps({ testID: "oli-tab-library" });
    expect(libraryTab.props.accessibilityState.selected).toBe(true);
    const dashTab = test.root.findByProps({ testID: "oli-tab-dash" });
    expect(dashTab.props.accessibilityState.selected).toBe(false);
  });

  it("does not mark any main tab selected when Manage route is focused", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={buildTabBarProps(4)} />);
    });
    for (const name of ["dash", "timeline", "program", "library"]) {
      const tab = test.root.findByProps({ testID: `oli-tab-${name}` });
      expect(tab.props.accessibilityState.selected).toBe(false);
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
    expect(MANAGE_HUB_ITEMS.length).toBe(10);
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
      "dna",
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

  it("navigates DNA to the placeholder route and closes", () => {
    const onClose = jest.fn();
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ManageMenu visible anchor={TEST_ANCHOR} onClose={onClose} />,
      );
    });
    const dnaRow = test.root.findByProps({ testID: "manage-hub-dna" });
    expect(dnaRow.props.disabled).toBeFalsy();
    act(() => {
      dnaRow.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/dna");
    expect(onClose).toHaveBeenCalled();
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

  it("does not falsely select Dash in the pill while Health menu is open", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <OliBottomNav tabBarProps={buildTabBarProps(0)} healthMenuOpen />,
      );
    });
    const dash = test.root.findByProps({ testID: "oli-tab-dash" });
    expect(dash.props.accessibilityState.selected).toBe(false);
    for (const id of ["strength", "cardio", "nutrition"]) {
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

  it("chrome renders pill and Health FAB as siblings (not five-in-pill)", () => {
    const openManage = jest.fn();
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <FloatingNavigationChrome
          tabBarProps={buildTabBarProps(0)}
          manageVisible={false}
          menuAnchor={null}
          openManage={openManage}
          closeManage={jest.fn()}
        />,
      );
    });
    test.root.findByProps({ testID: "oli-primary-nav-pill" });
    test.root.findByProps({ testID: "oli-health-fab" });
    expect(() => test.root.findByProps({ testID: "oli-manage-fab" })).toThrow();
    for (const item of PRIMARY_PILL_ITEMS) {
      test.root.findByProps({ testID: item.testID });
    }
  });

  it("Health FAB press opens menu via measure anchor (no route push)", () => {
    const openManage = jest.fn();
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <FloatingNavigationChrome
          tabBarProps={buildTabBarProps(0)}
          manageVisible={false}
          menuAnchor={null}
          openManage={openManage}
          closeManage={jest.fn()}
        />,
      );
    });
    // measureInWindow is unavailable in this RN mock — pressing still must not navigate.
    act(() => {
      test.root.findByProps({ testID: "oli-health-fab" }).props.onPress();
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
    expect(() => test.root.findByProps({ testID: "health-hub-body" })).toThrow();
    expect(() => test.root.findByProps({ testID: "health-hub-strength" })).toThrow();
    const flat = JSON.stringify(test.toJSON());
    expect(flat).toContain("Close");
    expect(flat).not.toContain("Body Composition");
    expect(flat).not.toContain("Recovery");
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
