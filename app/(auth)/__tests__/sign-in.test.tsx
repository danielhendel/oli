import React, { act } from "react";
import renderer from "react-test-renderer";
import fs from "node:fs";
import path from "node:path";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@/lib/auth/actions", () => ({
  signInWithEmail: jest.fn(),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  Alert: { alert: jest.fn() },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

import SignInScreen from "../sign-in";
import { UI_APP_SCREEN_BG, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

describe("Sign in screen", () => {
  it("uses the dark app background so the light iOS status bar stays readable", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<SignInScreen />);
    });
    const safe = test.root.findByProps({ testID: "sign-in-screen" });
    expect(safe.props.style).toEqual(expect.objectContaining({ backgroundColor: UI_APP_SCREEN_BG }));
    const title = test.root.findAllByType("Text").find((n) => n.children.includes("Sign in"));
    expect(title?.props.style).toEqual(expect.objectContaining({ color: UI_TEXT_PRIMARY }));
    expect(UI_APP_SCREEN_BG.toLowerCase()).not.toBe("#ffffff");
    expect(UI_APP_SCREEN_BG.toLowerCase()).not.toBe("#fff");
  });

  it("keeps the root status bar light to match the dark auth canvas", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../_layout.tsx"), "utf8");
    expect(src).toMatch(/<StatusBar style="light" \/>/);
  });
});
