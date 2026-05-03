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
  it("shows empty state title and body copy", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<DnaPlaceholderScreen />);
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("DNA insights coming soon");
    expect(str).toContain("Your genetic data and personalized insights will appear here.");
  });
});
