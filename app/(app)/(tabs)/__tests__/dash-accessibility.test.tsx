// app/(app)/(tabs)/__tests__/dash-accessibility.test.tsx
// Stage 2 Home accessibility: compact header + full-width category cards.

import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("@react-navigation/native", () => ({
  CommonActions: {
    navigate: jest.fn((opts: object) => ({ type: "NAVIGATE", payload: opts })),
  },
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "t1" }, initializing: false, getIdToken: jest.fn() }),
}));

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => ({ state: { status: "missing" } }),
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Modal: "Modal",
  ScrollView: "ScrollView",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  Platform: { OS: "ios", select: (v: { ios?: unknown; default?: unknown }) => v.ios ?? v.default },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/dash",
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => require("react").createElement("View", { "data-testid": "icon" }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const DashScreen = require("../dash").default;

function findPressablesWithLabel(
  root: renderer.ReactTestInstance,
  label: string,
): renderer.ReactTestInstance[] {
  const pressables = root.findAllByType("Pressable");
  return pressables.filter(
    (p) => (p.props as { accessibilityLabel?: string }).accessibilityLabel === label,
  );
}

describe("Home accessibility (Stage 2)", () => {
  it("exposes Open navigation menu and Open settings", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    expect(findPressablesWithLabel(test.root, "Open navigation menu").length).toBeGreaterThanOrEqual(1);
    expect(findPressablesWithLabel(test.root, "Open settings").length).toBeGreaterThanOrEqual(1);
  });

  it("announces Oli as a header once", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const headers = test.root.findAll(
      (n) =>
        n.type === "Text" &&
        (n.props as { accessibilityRole?: string }).accessibilityRole === "header" &&
        String((n.children ?? []).join("")) === "Oli",
    );
    expect(headers.length).toBe(1);
  });

  it("exposes seven category cards as buttons without Daily Monitor a11y labels", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });

    for (const id of [
      "body_composition",
      "strength",
      "cardio_fitness",
      "nutrition",
      "sleep",
      "recovery",
      "health",
    ]) {
      const card = test.root.findByProps({ testID: `home-category-card-${id}` });
      expect(card.props.accessibilityRole).toBe("button");
    }

    expect(
      test.root.findAll(
        (n) => (n.props as { accessibilityLabel?: string }).accessibilityLabel === "Daily energy card",
      ),
    ).toHaveLength(0);
    expect(
      test.root.findAll(
        (n) => (n.props as { accessibilityLabel?: string }).accessibilityLabel === "Daily nutrition card",
      ),
    ).toHaveLength(0);
  });

  it("keeps actionable header buttons", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const pressables = test.root.findAllByType("Pressable");
    const withRole = pressables.filter(
      (p) => (p.props as { accessibilityRole?: string }).accessibilityRole === "button",
    );
    expect(withRole.length).toBeGreaterThanOrEqual(2);
  });
});
