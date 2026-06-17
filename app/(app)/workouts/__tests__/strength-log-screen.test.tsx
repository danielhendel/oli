import React from "react";
import renderer, { act } from "react-test-renderer";

const mockSetOptions = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useNavigation: () => ({
    setOptions: (opts: Record<string, unknown>) => mockSetOptions(opts),
    goBack: jest.fn(),
  }),
}));

jest.mock("@/lib/ui/logs/WorkoutModuleLogScreen", () => ({
  WorkoutModuleLogScreen: (props: { title: string; testId: string }) => {
    const { View, Text } = require("react-native");
    return (
      <View testID={props.testId}>
        <Text>{props.title}</Text>
      </View>
    );
  },
}));

import StrengthLogScreen from "../list";

describe("StrengthLogScreen", () => {
  it("renders Strength Log with simple list shell", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthLogScreen />);
      await Promise.resolve();
    });
    expect(tree.root.findByProps({ testID: "strength-log-screen" })).toBeDefined();
    expect(tree.root.findByProps({ children: "Strength Log" })).toBeDefined();
    const flat = JSON.stringify(tree.toJSON());
    expect(flat).not.toMatch(/January|monthPill|listSectionMonth/i);
  });
});
