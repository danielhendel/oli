import React from "react";
import renderer, { act } from "react-test-renderer";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ day: "2026-03-15" }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

jest.mock("@/lib/ui/nutrition/NutritionLogHub", () => ({
  NutritionLogHub: ({ onSelectMode }: { onSelectMode: (mode: string) => void }) => {
    const React = require("react");
    const { Pressable, Text } = require("react-native");
    return React.createElement(
      Pressable,
      { testID: "hub-search", onPress: () => onSelectMode("search") },
      React.createElement(Text, null, "Search"),
    );
  },
}));

import NutritionLogHubScreen from "../log-hub";

describe("NutritionLogHubScreen — selected day propagation", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("threads the day param into child routes", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionLogHubScreen />);
    });
    const hubBtn = tree!.root.findByProps({ testID: "hub-search" });
    hubBtn.props.onPress();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/nutrition/search",
      params: { day: "2026-03-15" },
    });
  });
});
