import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("expo-router", () => ({
  useNavigation: () => ({
    setOptions: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock("@/lib/ui/HeaderBackButton", () => ({
  HeaderBackButton: "HeaderBackButton",
}));

import DnaPlaceholderScreen from "../index";

describe("DNA placeholder screen", () => {
  it("uses the shared Health record placeholder design", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<DnaPlaceholderScreen />);
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("dna-placeholder");
    expect(str).toContain("Not set up yet");
    expect(str).toContain("This record system is not implemented yet");
    expect(str).toContain("Add DNA");
    expect(str).toContain("Coming soon");
    expect(str).toContain("health-record-placeholder-action");
    expect(str).not.toContain("DNA insights coming soon");
    expect(str).not.toMatch(/"fontWeight":"900"/);
  });
});
