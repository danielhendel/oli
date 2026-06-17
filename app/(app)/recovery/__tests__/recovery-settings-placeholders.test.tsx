import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
  useRouter: () => ({ replace: jest.fn() }),
  Redirect: ({ href }: { href: string }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, `Redirect:${href}`);
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import SleepSettingsScreen from "../sleep/settings";
import ReadinessSettingsScreen from "../readiness/settings";

describe("Recovery module settings placeholders", () => {
  it("Sleep settings redirects to sleep log", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepSettingsScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("Redirect:/(app)/recovery/sleep/list");
  });

  it("Readiness settings screen renders placeholder title", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReadinessSettingsScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("Readiness settings");
  });
});
