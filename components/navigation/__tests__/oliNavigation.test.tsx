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
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
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

const TEST_ANCHOR = { x: 300, y: 680, width: 52, height: 52 };

function buildTabBarProps(focusedRouteIndex: number): BottomTabBarProps {
  const routes = [
    { key: "dash-k", name: "dash" },
    { key: "timeline-k", name: "timeline" },
    { key: "library-k", name: "library" },
    { key: "profile-k", name: "profile" },
    { key: "manage-k", name: "manage" },
  ];
  const titles: Record<string, string> = {
    dash: "Dash",
    timeline: "Timeline",
    library: "Library",
    profile: "Profile",
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
  });

  it("renders four main tabs", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliBottomNav tabBarProps={buildTabBarProps(0)} />);
    });
    const ids = ["dash", "timeline", "library", "profile"].map((n) => `oli-tab-${n}`);
    for (const id of ids) {
      test.root.findByProps({ testID: id });
    }
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
    for (const name of ["dash", "timeline", "library", "profile"]) {
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
    expect(MANAGE_HUB_ITEMS.length).toBe(9);
  });

  it("lists Manage categories in the required order", () => {
    expect(MANAGE_HUB_ITEMS.map((x) => x.id)).toEqual([
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
