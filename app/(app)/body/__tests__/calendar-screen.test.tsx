import React from "react";
import renderer, { act } from "react-test-renderer";

const mockPush = jest.fn();
const mockFlatListProps = jest.fn();
const mockSetOptions = jest.fn();

jest.mock("react-native", () => {
  const ReactLib = require("react");
  return {
    View: "View",
    Text: "Text",
    Pressable: "Pressable",
    StyleSheet: { create: (s: unknown) => s },
    Platform: { OS: "ios" },
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
  useNavigation: () => ({
    setOptions: mockSetOptions,
    goBack: jest.fn(),
  }),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => {
  const actual = jest.requireActual<typeof import("@/lib/ui/calendar/dateUtils")>("@/lib/ui/calendar/dateUtils");
  return {
    ...actual,
    getTodayDayKeyLocal: jest.fn(() => "2026-04-07"),
  };
});

const mockHook = jest.fn();
jest.mock("@/lib/data/body/useBodyCompositionData", () => ({
  useBodyCompositionData: (...args: unknown[]) => mockHook(...args),
}));

const Screen = require("../calendar").default as React.ComponentType;

describe("Body calendar screen", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockFlatListProps.mockClear();
    mockSetOptions.mockClear();
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

  it("initializes calendar around local today month and scroll index matches Strength pattern", () => {
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
    expect(text).toContain("April 2026");
    expect(mockSetOptions).toHaveBeenCalled();
    const opts = mockSetOptions.mock.calls[0]?.[0] as { headerTitle?: () => React.ReactElement };
    expect(typeof opts?.headerTitle).toBe("function");
  });
});
