import React, { act } from "react";
import renderer from "react-test-renderer";
import fs from "node:fs";
import path from "node:path";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSignInWithEmail = jest.fn();
const mockAlert = jest.fn();

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock("@/lib/auth/actions", () => ({
  signInWithEmail: (...args: unknown[]) => mockSignInWithEmail(...args),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

import SignInScreen from "../sign-in";
import { UI_APP_SCREEN_BG, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";
import { CONSUMER_HOME_HREF } from "@/lib/navigation/consumerHome";

describe("Sign in screen", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockSignInWithEmail.mockReset();
    mockAlert.mockReset();
  });

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

  it("exposes Forgot password navigation without replacing Create an account", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<SignInScreen />);
    });

    const forgot = test.root.findByProps({ testID: "sign-in-forgot-password" });
    expect(forgot.props.accessibilityLabel).toBe("Forgot password?");
    expect(forgot.props.accessibilityRole).toBe("link");

    act(() => {
      forgot.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(auth)/forgot-password");

    expect(test.root.findByProps({ testID: "sign-in-create-account" })).toBeTruthy();
  });

  it("alerts only mapped safe copy, never raw Firebase strings", async () => {
    mockSignInWithEmail.mockResolvedValue({
      ok: false,
      title: "Sign in failed",
      message: "The email or password is incorrect.",
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<SignInScreen />);
    });
    act(() => {
      test.root.findByProps({ testID: "sign-in-email" }).props.onChangeText("person@oli.test");
      test.root.findByProps({ testID: "sign-in-password" }).props.onChangeText("bad-pass");
    });
    await act(async () => {
      test.root.findByProps({ testID: "sign-in-submit" }).props.onPress();
    });

    expect(mockAlert).toHaveBeenCalledWith(
      "Sign in failed",
      "The email or password is incorrect.",
    );
    const alertPayload = JSON.stringify(mockAlert.mock.calls);
    expect(alertPayload).not.toMatch(/Firebase|auth\/invalid-credential|auth\/wrong-password/i);
  });

  it("routes successful sign-in to Home", async () => {
    mockSignInWithEmail.mockResolvedValue({ ok: true });
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<SignInScreen />);
    });
    act(() => {
      test.root.findByProps({ testID: "sign-in-email" }).props.onChangeText("person@oli.test");
      test.root.findByProps({ testID: "sign-in-password" }).props.onChangeText("good-pass");
    });
    await act(async () => {
      test.root.findByProps({ testID: "sign-in-submit" }).props.onPress();
    });
    expect(mockReplace).toHaveBeenCalledWith(CONSUMER_HOME_HREF);
  });

  it("prevents duplicate submission while sign-in is in flight", async () => {
    let resolveSignIn!: (value: { ok: true }) => void;
    mockSignInWithEmail.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<SignInScreen />);
    });
    act(() => {
      test.root.findByProps({ testID: "sign-in-email" }).props.onChangeText("person@oli.test");
      test.root.findByProps({ testID: "sign-in-password" }).props.onChangeText("good-pass");
    });

    await act(async () => {
      test.root.findByProps({ testID: "sign-in-submit" }).props.onPress();
    });
    await act(async () => {
      test.root.findByProps({ testID: "sign-in-submit" }).props.onPress();
    });

    expect(mockSignInWithEmail).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSignIn({ ok: true });
    });
  });

  it("source does not display error.message directly from Firebase", () => {
    const src = fs.readFileSync(path.join(__dirname, "../sign-in.tsx"), "utf8");
    expect(src).toContain("signInWithEmail");
    expect(src).toContain("Alert.alert(result.title, result.message)");
    expect(src).not.toMatch(/e\.message|error\.message/);
    expect(src).not.toMatch(/sendPasswordResetEmail|getFirestore/);
  });
});
