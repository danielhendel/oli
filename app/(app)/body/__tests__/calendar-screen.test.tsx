import React from "react";
import renderer, { act } from "react-test-renderer";

const mockPush = jest.fn();
const mockFlatListProps = jest.fn();

jest.mock("react-native", () => {
  const ReactLib = require("react");
  return {
    View: "View",
    Text: "Text",
    Pressable: "Pressable",
    StyleSheet: { create: (s: unknown) => s },
    FlatList: (props: { data: unknown[]; renderItem: (item: { item: unknown }) => React.ReactElement }) => {
      mockFlatListProps(props);
      return ReactLib.createElement(
        "View",
        null,
        ...props.data.map((item, idx) => ReactLib.createElement("View", { key: idx }, props.renderItem({ item }))),
      );
    },
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockHook = jest.fn();
jest.mock("@/lib/data/body/useBodyCompositionData", () => ({
  useBodyCompositionData: (...args: unknown[]) => mockHook(...args),
}));

const Screen = require("../calendar").default as React.ComponentType;

describe("Body calendar screen", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockFlatListProps.mockClear();
  });

  it("routes to body day from month grid day tap", () => {
    const day = new Date().toISOString().slice(0, 10);
    mockHook.mockReturnValue({
      today: "2026-03-31",
      markedDays: new Set<string>([day]),
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const dayCell = tree.root
      .findAllByType("Pressable")
      .find((p) => p.props.accessibilityLabel === `${day}, has body measurement`);
    expect(dayCell).toBeDefined();
    act(() => {
      dayCell!.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/body/day/[day]",
      params: { day },
    });
  });

  it("initializes calendar around January 2026", () => {
    mockHook.mockReturnValue({
      today: "2026-03-31",
      markedDays: new Set<string>(),
    });
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(Screen));
    });
    const flatListProps = mockFlatListProps.mock.calls[0]?.[0] as { initialScrollIndex?: number } | undefined;
    expect(flatListProps?.initialScrollIndex).toBe(12);
    const text = tree.root
      .findAllByType("Text")
      .flatMap((node) => node.children)
      .filter((x) => typeof x === "string")
      .join(" ");
    expect(text).toContain("January 2026");
  });
});

