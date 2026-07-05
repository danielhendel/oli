import React, { act } from "react";
import renderer from "react-test-renderer";

import { MANAGE_HUB_ITEMS } from "@/components/navigation/manageHubItems";
import { ManageMenu } from "@/components/navigation/ManageMenu";

const mockPush = jest.fn();
const mockClose = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
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
    hairlineWidth: 1,
  },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 20, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

const HEADER_ANCHOR = { x: 20, y: 60, width: 44, height: 44, presentation: "popover" as const };
const FAB_ANCHOR = { x: 300, y: 680, width: 52, height: 52, presentation: "fab" as const };

function collectText(root: renderer.ReactTestRenderer): string {
  return root.root
    .findAllByType("Text")
    .map((n) =>
      (n.children as (string | number)[])
        .filter((c) => typeof c === "string" || typeof c === "number")
        .join(""),
    )
    .join(" ");
}

describe("ManageMenu popover presentation", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockClose.mockReset();
  });

  it("renders compact labeled popover for header hamburger", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <ManageMenu visible anchor={HEADER_ANCHOR} onClose={mockClose} />,
      );
    });

    expect(root.root.findByProps({ testID: "oli-manage-menu-popover" })).toBeTruthy();
    expect(() => root.root.findByProps({ testID: "oli-manage-menu" })).toThrow();

    const text = collectText(root);
    for (const item of MANAGE_HUB_ITEMS) {
      expect(text).toContain(item.label);
    }

    const scrim = root.root.findByProps({ testID: "manage-menu-popover-scrim" });
    const scrimColor = flattenBackgroundColor(scrim.props.style);
    expect(scrimColor).toBe("rgba(0,0,0,0.16)");
  });

  it("navigates and closes when a popover item is pressed", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <ManageMenu visible anchor={HEADER_ANCHOR} onClose={mockClose} />,
      );
    });

    const row = root.root.findByProps({ testID: "manage-hub-activity" });
    act(() => {
      row.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith("/(app)/activity");
    expect(mockClose).toHaveBeenCalled();
  });

  it("keeps bottom FAB presentation separate", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<ManageMenu visible anchor={FAB_ANCHOR} onClose={mockClose} />);
    });

    expect(root.root.findByProps({ testID: "oli-manage-menu" })).toBeTruthy();
    expect(() => root.root.findByProps({ testID: "oli-manage-menu-popover" })).toThrow();
    expect(root.root.findByProps({ testID: "manage-menu-close" })).toBeTruthy();
  });
});

function flattenBackgroundColor(style: unknown): string | undefined {
  if (style == null) return undefined;
  if (Array.isArray(style)) {
    for (const part of style) {
      const color = flattenBackgroundColor(part);
      if (color) return color;
    }
    return undefined;
  }
  if (typeof style === "object" && style !== null && "backgroundColor" in style) {
    return (style as { backgroundColor?: string }).backgroundColor;
  }
  return undefined;
}
