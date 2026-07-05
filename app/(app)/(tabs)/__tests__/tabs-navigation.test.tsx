// app/(app)/(tabs)/__tests__/tabs-navigation.test.tsx
// Sprint 3 — Navigation: four primary tabs; Dash is initial route.

import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("@react-navigation/native", () => {
  const fonts = {
    regular: { fontFamily: "System", fontWeight: "400" },
    medium: { fontFamily: "System", fontWeight: "500" },
    bold: { fontFamily: "System", fontWeight: "600" },
    heavy: { fontFamily: "System", fontWeight: "700" },
  };
  return {
    CommonActions: {
      navigate: jest.fn((opts: { name: string; merge?: boolean; params?: object }) => ({
        type: "NAVIGATE",
        payload: opts,
      })),
    },
    DefaultTheme: {
      dark: false,
      colors: {
        primary: "rgb(0, 122, 255)",
        background: "rgb(242, 242, 247)",
        card: "rgb(242, 242, 247)",
        text: "rgb(28, 28, 30)",
        border: "rgb(216, 216, 216)",
        notification: "rgb(255, 59, 48)",
      },
      fonts,
    },
    DarkTheme: {
      dark: true,
      colors: {
        primary: "rgb(10, 132, 255)",
        background: "rgb(1, 1, 1)",
        card: "rgb(28, 28, 30)",
        text: "rgb(255, 255, 255)",
        border: "rgb(39, 39, 41)",
        notification: "rgb(255, 69, 58)",
      },
      fonts,
    },
    ThemeProvider: ({ children }: { children?: unknown }) => children,
  };
});

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Modal: "Modal",
  ScrollView: "ScrollView",
  Animated: {
    View: "Animated.View",
    Value: function Value() {
      return { setValue: jest.fn(), interpolate: () => 0 };
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
  PanResponder: {
    create: () => ({
      panHandlers: {},
    }),
  },
  useWindowDimensions: () => ({ width: 400, height: 800, scale: 2, fontScale: 1 }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => require("react").createElement("View", { "data-testid": "icon" }),
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const MockTabs = ({
    children,
    initialRouteName,
    tabBar,
  }: {
    children?: React.ReactNode;
    initialRouteName?: string;
    tabBar?: (props: unknown) => React.ReactNode;
  }) => {
    const bar = tabBar
      ? tabBar({
          state: {
            index: 0,
            routes: [
              { key: "d", name: "dash" },
              { key: "t", name: "timeline" },
              { key: "pr", name: "program" },
              { key: "l", name: "library" },
            ],
          },
          descriptors: {},
          navigation: { emit: () => ({ defaultPrevented: false }), dispatch: jest.fn() },
          insets: { top: 0, bottom: 0, left: 0, right: 0 },
        })
      : null;
    return React.createElement(
      "View",
      { "data-initial-route": initialRouteName, "data-testid": "tabs" },
      children,
      bar,
    );
  };
  MockTabs.Screen = ({ name, options }: { name: string; options?: { title?: string; href?: null } }) =>
    React.createElement("View", {
      "data-tab-name": name,
      "data-tab-title": options?.title ?? name,
      "data-tab-href": options?.href === null ? "hidden" : "visible",
    });
  return {
    Tabs: MockTabs,
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  };
});

import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const layoutModule = require("../_layout");
const TabsLayout = layoutModule.default;
const { OLI_TAB_SCREEN_OPTIONS, createOliTabNavigationTheme } = layoutModule;

function findTabs(test: renderer.ReactTestRenderer): { name: string; title: string }[] {
  const tabs: { name: string; title: string }[] = [];
  const find = (node: renderer.ReactTestInstance) => {
    const p = node.props;
    if (p && "data-tab-name" in p) {
      tabs.push({
        name: p["data-tab-name"] as string,
        title: (p["data-tab-title"] as string) ?? "",
      });
    }
    node.children.forEach((c) => {
      if (typeof c === "object" && c !== null && "children" in c) find(c as renderer.ReactTestInstance);
    });
  };
  find(test.root);
  return tabs;
}

describe("TabsLayout", () => {
  it("has initialRouteName dash", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<TabsLayout />);
    });

    const tabsNode = test.root.findByProps({ "data-testid": "tabs" });
    expect(tabsNode.props["data-initial-route"]).toBe("dash");
  });

  it("registers four primary tabs in order (Dash, Timeline, Program, Library)", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<TabsLayout />);
    });

    const tabs = findTabs(test);
    const names = tabs.map((t) => t.name);
    expect(names).toEqual(["dash", "timeline", "program", "library"]);

    const primaryTitles = tabs.map((t) => t.title);
    expect(primaryTitles).toEqual(["Dash", "Timeline", "Program", "Library"]);
  });

  it("does not register Profile as a bottom nav tab", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<TabsLayout />);
    });

    const names = findTabs(test).map((t) => t.name);
    expect(names).not.toContain("profile");
  });

  it("renders Profile shortcut FAB in tab bar chrome", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TabsLayout />);
    });
    test.root.findByProps({ testID: "oli-profile-fab" });
  });

  it("sets tab scene background to app screen token so default RN theme gray does not show behind content", () => {
    expect(OLI_TAB_SCREEN_OPTIONS.sceneStyle.backgroundColor).toBe(UI_APP_SCREEN_BG);
  });

  it("tab navigator theme forces colors.background and colors.card to the app shell token", () => {
    const theme = createOliTabNavigationTheme();
    expect(theme.colors.background).toBe(UI_APP_SCREEN_BG);
    expect(theme.colors.card).toBe(UI_APP_SCREEN_BG);
  });

  it("uses a transparent tab bar style so no default gray strip shows behind the custom bar", () => {
    expect(OLI_TAB_SCREEN_OPTIONS.tabBarStyle.backgroundColor).toBe("transparent");
    expect(OLI_TAB_SCREEN_OPTIONS.tabBarStyle.borderTopWidth).toBe(0);
    expect(OLI_TAB_SCREEN_OPTIONS.tabBarStyle.elevation).toBe(0);
    expect(OLI_TAB_SCREEN_OPTIONS.tabBarStyle.shadowOpacity).toBe(0);
    expect(OLI_TAB_SCREEN_OPTIONS.tabBarStyle.position).toBe("absolute");
    expect(OLI_TAB_SCREEN_OPTIONS.tabBarStyle.left).toBe(0);
    expect(OLI_TAB_SCREEN_OPTIONS.tabBarStyle.right).toBe(0);
    expect(OLI_TAB_SCREEN_OPTIONS.tabBarStyle.bottom).toBe(0);
  });

  it("keeps the tab bar chrome wrapper transparent", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TabsLayout />);
    });
    const chrome = test.root.findByProps({ testID: "oli-tab-bar-chrome" });
    const rawStyle = chrome.props.style as unknown;
    const merged =
      Array.isArray(rawStyle)
        ? Object.assign({}, ...rawStyle.filter((s): s is Record<string, unknown> => typeof s === "object" && s != null))
        : rawStyle;
    expect((merged as { backgroundColor?: string }).backgroundColor).toBe("transparent");
    expect((merged as { position?: string }).position).toBe("absolute");
    expect((merged as { left?: number }).left).toBe(0);
    expect((merged as { right?: number }).right).toBe(0);
    expect((merged as { bottom?: number }).bottom).toBe(0);
    expect(chrome.props.pointerEvents).toBe("box-none");
  });
});
