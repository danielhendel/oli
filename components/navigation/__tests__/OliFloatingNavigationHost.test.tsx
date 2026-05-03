import React, { act } from "react";
import renderer from "react-test-renderer";

const mockPush = jest.fn();
const mockPathname = jest.fn<string, []>(() => "/body");

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
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
  useWindowDimensions: () => ({ width: 400, height: 800, scale: 2, fontScale: 1 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

import { OliFloatingNavigationHost } from "@/components/navigation/OliFloatingNavigationHost";

describe("OliFloatingNavigationHost", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockPathname.mockReturnValue("/body");
  });

  it("renders stack floating nav on health module routes", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <OliFloatingNavigationHost onStackChromeHeightChange={jest.fn()} />,
      );
    });
    test.root.findByProps({ testID: "oli-stack-floating-nav" });
  });

  it("does not render on tab routes (pathname not in stack allowlist)", () => {
    mockPathname.mockReturnValue("/dash");
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <OliFloatingNavigationHost onStackChromeHeightChange={jest.fn()} />,
      );
    });
    expect(() => test.root.findByProps({ testID: "oli-stack-floating-nav" })).toThrow();
  });

  it("does not render on Activity analytics stack screens", () => {
    mockPathname.mockReturnValue("/activity/analytics");
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <OliFloatingNavigationHost onStackChromeHeightChange={jest.fn()} />,
      );
    });
    expect(() => test.root.findByProps({ testID: "oli-stack-floating-nav" })).toThrow();
  });

  it("clears chrome height when hidden", () => {
    const onHeight = jest.fn();
    mockPathname.mockReturnValue("/body");
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OliFloatingNavigationHost onStackChromeHeightChange={onHeight} />);
    });
    act(() => {
      test.update(<OliFloatingNavigationHost onStackChromeHeightChange={onHeight} />);
      mockPathname.mockReturnValue("/dash");
      test.update(<OliFloatingNavigationHost onStackChromeHeightChange={onHeight} />);
    });
    expect(onHeight).toHaveBeenCalledWith(undefined);
  });
});
