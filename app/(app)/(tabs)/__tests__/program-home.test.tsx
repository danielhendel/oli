import React, { act } from "react";
import fs from "node:fs";
import path from "node:path";
import renderer from "react-test-renderer";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: {} },
  }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s },
}));

import ProgramScreen from "../program";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

beforeEach(() => {
  mockPush.mockClear();
});

function renderProgram(): renderer.ReactTestRenderer {
  let test!: renderer.ReactTestRenderer;
  act(() => {
    test = renderer.create(<ProgramScreen />);
  });
  return test;
}

describe("Program tab", () => {
  it("renders the Program header title", () => {
    const test = renderProgram();
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Program");
  });

  it("renders the + button instead of the settings gear", () => {
    const test = renderProgram();
    expect(test.root.findByProps({ testID: "program-add-button" })).toBeTruthy();
    const str = JSON.stringify(test.toJSON());
    expect(str).not.toContain("Settings");
  });

  it("renders the + icon using the white primary text token", () => {
    const buttonPath = path.join(__dirname, "../../../../lib/ui/program/ProgramAddButton.tsx");
    const src = fs.readFileSync(buttonPath, "utf8");
    expect(src).toContain("UI_TEXT_PRIMARY");
    expect(src).not.toContain("#1C1C1E");
    expect(UI_TEXT_PRIMARY).toBe("#F7F8FA");
  });

  it("navigates to the Program Builder hub when + is pressed", () => {
    const test = renderProgram();
    const addBtn = test.root.findByProps({ testID: "program-add-button" });
    act(() => {
      (addBtn.props.onPress as () => void)();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/program/builder");
  });

  it("does not render the Builders section or builder cards", () => {
    const test = renderProgram();
    const str = JSON.stringify(test.toJSON());
    expect(str).not.toContain("Builders");
    expect(str).not.toContain("ACTIVE PROGRAM");
    expect(str).not.toContain("Workout Builder");
    expect(str).not.toContain("program-builder-card-workout");
  });

  it("renders category cards for plan design", () => {
    const test = renderProgram();
    expect(test.root.findByProps({ testID: "program-category-cards" })).toBeTruthy();
    expect(test.root.findByProps({ testID: "program-category-activity" })).toBeTruthy();
  });

  it("renders the empty state when no current programs exist", () => {
    const test = renderProgram();
    expect(test.root.findByProps({ testID: "program-current-empty" })).toBeTruthy();
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("No active programs yet");
    expect(str).not.toContain("Saved Programs");
    expect(str).not.toContain("Shared Programs");
  });

  it("does not add Firebase or raw HTTP/API calls to the Program route", () => {
    const routePath = path.join(__dirname, "..", "program.tsx");
    const src = fs.readFileSync(routePath, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/from\s+["'][^"']*firebase[^"']*["']/i);
    expect(src).not.toMatch(/from\s+["'][^"']*lib\/api\/http["']/);
    expect(src).not.toMatch(/apiGet[A-Za-z]*\s*\(/);
  });
});
