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

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: {
      status: "ready" as const,
      preferences: {
        units: { mass: "lb" as const },
        timezone: { mode: "recorded" as const },
        selectedGymId: null,
      },
    },
    refresh: jest.fn(),
    setMassUnit: jest.fn(),
    setSelectedGymId: jest.fn(),
    setMetricSourcePreference: jest.fn(),
  }),
}));

import WorkoutsSettingsScreen from "../settings";

describe("WorkoutsSettingsScreen", () => {
  it("redirects to Strength log route", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WorkoutsSettingsScreen />);
      await Promise.resolve();
    });
    const str = JSON.stringify(tree!.toJSON());
    expect(str).toContain("Redirect:/(app)/workouts/list");
  });
});
