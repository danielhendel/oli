import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

import DnaPlaceholderScreen from "../index";

describe("DNA placeholder screen", () => {
  it("says not implemented rather than implying empty records", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<DnaPlaceholderScreen />);
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Not set up yet");
    expect(str).toContain("This record system is not implemented yet");
    expect(str).not.toContain("DNA insights coming soon");
  });
});
