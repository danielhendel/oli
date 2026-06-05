import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

jest.mock("@/lib/ui/SettingsGearButton", () => ({
  SettingsGearButton: () => null,
}));

import ProgramScreen from "../program";

describe("Program tab screen", () => {
  it("renders the Program header and create/manage placeholder copy", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<ProgramScreen />);
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Program");
    expect(str).toContain("Build your program");
    expect(str).toContain("Create and manage your training programs here.");
  });
});
