import React, { act } from "react";
import renderer from "react-test-renderer";

const mockPush = jest.fn();
const mockNavigatePrimary = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => "/dash",
}));

jest.mock("@/lib/navigation/navigatePrimaryDestination", () => ({
  navigatePrimaryDestination: (...args: unknown[]) => mockNavigatePrimary(...args),
}));

jest.mock("@/lib/navigation/resolvePrimaryNavActiveDestination", () => ({
  resolvePrimaryNavActiveDestination: () => "home",
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AppNavigationDrawer } = require("../AppNavigationDrawer");

describe("AppNavigationDrawer", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockNavigatePrimary.mockClear();
  });

  it("renders modal navigation surface with Close and launch destinations", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(AppNavigationDrawer, { visible: true, onClose: jest.fn() }),
      );
    });

    const modal = tree.root.findByType("Modal" as unknown as React.ComponentType);
    expect(modal.props.accessibilityViewIsModal).toBe(true);
    expect(modal.props.onRequestClose).toEqual(expect.any(Function));

    tree.root.findByProps({ testID: "app-navigation-drawer-close" });
    tree.root.findByProps({ testID: "app-nav-drawer-home" });
    tree.root.findByProps({ testID: "app-nav-drawer-today" });
    tree.root.findByProps({ testID: "app-nav-drawer-category-body_composition" });
    tree.root.findByProps({ testID: "app-nav-drawer-devices" });

    const labels = tree.root
      .findAllByType("Text")
      .map((n) => String((n.children ?? []).join("")))
      .join(" ");
    expect(labels).not.toContain("Command Center");
    expect(labels).not.toContain("Debug Token");
    expect(labels).not.toContain("Daily Recap");
  });

  it("closes without navigating when Home is already active", () => {
    const onClose = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(AppNavigationDrawer, { visible: true, onClose }),
      );
    });

    const home = tree.root.findByProps({ testID: "app-nav-drawer-home" });
    act(() => {
      home.props.onPress();
    });
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigatePrimary).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates Today once then closes", () => {
    const onClose = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(AppNavigationDrawer, { visible: true, onClose }),
      );
    });

    const today = tree.root.findByProps({ testID: "app-nav-drawer-today" });
    act(() => {
      today.props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockNavigatePrimary).toHaveBeenCalledTimes(1);
    expect(mockNavigatePrimary.mock.calls[0]![0].item.id).toBe("today");
  });

  it("pushes category href once and closes", () => {
    const onClose = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(AppNavigationDrawer, { visible: true, onClose }),
      );
    });

    const body = tree.root.findByProps({ testID: "app-nav-drawer-category-body_composition" });
    act(() => {
      body.props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/(app)/body");
  });
});
