import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useNavigation: () => ({
    setOptions: jest.fn(),
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

import CardioLogScreen from "../list";

describe("CardioLogScreen", () => {
  it("renders Cardio Log with simple list shell", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioLogScreen />);
      await Promise.resolve();
    });
    expect(tree.root.findByProps({ testID: "cardio-log-screen" })).toBeDefined();
    expect(tree.root.findByProps({ children: "Cardio Log" })).toBeDefined();
    const flat = JSON.stringify(tree.toJSON());
    expect(flat).not.toMatch(/January|monthPill|listSectionMonth/i);
  });
});
