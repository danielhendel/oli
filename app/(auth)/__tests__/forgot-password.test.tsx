import React, { act } from "react";
import renderer from "react-test-renderer";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRequestPasswordReset = jest.fn();

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock("@/lib/auth/actions", () => ({
  requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Platform: { OS: "ios" },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

import ForgotPasswordScreen from "../forgot-password";

describe("Forgot password screen", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockRequestPasswordReset.mockReset();
  });

  it("renders email field, submit, and accessible title", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<ForgotPasswordScreen />);
    });

    expect(test.root.findByProps({ testID: "forgot-password-title" }).props.children).toBe(
      "Reset your password",
    );
    const email = test.root.findByProps({ testID: "forgot-password-email" });
    expect(email.props.accessibilityLabel).toBe("Email");
    expect(email.props.keyboardType).toBe("email-address");
    expect(email.props.autoCapitalize).toBe("none");
    expect(email.props.autoCorrect).toBe(false);

    const submit = test.root.findByProps({ testID: "forgot-password-submit" });
    expect(submit.props.accessibilityLabel).toBe("Send reset instructions");
    expect(submit.props.accessibilityRole).toBe("button");
  });

  it("shows loading then neutral success without account-existence copy", async () => {
    let resolveReset!: (value: { ok: true }) => void;
    mockRequestPasswordReset.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReset = resolve;
        }),
    );

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<ForgotPasswordScreen />);
    });

    const email = test.root.findByProps({ testID: "forgot-password-email" });
    act(() => {
      email.props.onChangeText("person@oli.test");
    });

    const submit = test.root.findByProps({ testID: "forgot-password-submit" });
    await act(async () => {
      submit.props.onPress();
    });

    expect(JSON.stringify(test.toJSON())).toContain("Sending");

    await act(async () => {
      resolveReset({ ok: true });
    });

    const text = JSON.stringify(test.toJSON());
    expect(test.root.findByProps({ testID: "forgot-password-success" })).toBeTruthy();
    expect(text).toContain("Check your email");
    expect(text).toContain("If an Oli account exists for that address");
    expect(text).not.toMatch(/no account|not registered|user-not-found|Firebase/i);
  });

  it("shows invalid email state and allows retry after correction", async () => {
    mockRequestPasswordReset.mockResolvedValue({
      ok: false,
      kind: "invalid_email",
      title: "Check your email",
      message: "Enter a valid email address to continue.",
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<ForgotPasswordScreen />);
    });

    act(() => {
      test.root.findByProps({ testID: "forgot-password-email" }).props.onChangeText("bad");
    });
    await act(async () => {
      test.root.findByProps({ testID: "forgot-password-submit" }).props.onPress();
    });

    expect(test.root.findByProps({ testID: "forgot-password-error" })).toBeTruthy();
    expect(JSON.stringify(test.toJSON())).toContain("Enter a valid email address");

    mockRequestPasswordReset.mockResolvedValue({ ok: true });
    act(() => {
      test.root.findByProps({ testID: "forgot-password-email" }).props.onChangeText("person@oli.test");
    });
    expect(() => test.root.findByProps({ testID: "forgot-password-error" })).toThrow();

    await act(async () => {
      test.root.findByProps({ testID: "forgot-password-submit" }).props.onPress();
    });
    expect(test.root.findByProps({ testID: "forgot-password-success" })).toBeTruthy();
  });

  it("shows retryable network state", async () => {
    mockRequestPasswordReset.mockResolvedValue({
      ok: false,
      kind: "network",
      title: "Connection problem",
      message: "Check your connection and try again.",
    });

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<ForgotPasswordScreen />);
    });
    act(() => {
      test.root.findByProps({ testID: "forgot-password-email" }).props.onChangeText("person@oli.test");
    });
    await act(async () => {
      test.root.findByProps({ testID: "forgot-password-submit" }).props.onPress();
    });

    const error = JSON.stringify(test.toJSON());
    expect(test.root.findByProps({ testID: "forgot-password-error" })).toBeTruthy();
    expect(error).toContain("Check your connection");
    expect(error).not.toMatch(/auth\/|Firebase/i);
  });

  it("returns to Sign In", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<ForgotPasswordScreen />);
    });
    act(() => {
      test.root.findByProps({ testID: "forgot-password-return-sign-in" }).props.onPress();
    });
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/sign-in");
  });

  it("prevents duplicate submission while request is in flight", async () => {
    let resolveReset!: (value: { ok: true }) => void;
    mockRequestPasswordReset.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReset = resolve;
        }),
    );

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<ForgotPasswordScreen />);
    });
    act(() => {
      test.root.findByProps({ testID: "forgot-password-email" }).props.onChangeText("person@oli.test");
    });

    await act(async () => {
      test.root.findByProps({ testID: "forgot-password-submit" }).props.onPress();
    });
    await act(async () => {
      test.root.findByProps({ testID: "forgot-password-submit" }).props.onPress();
    });

    expect(mockRequestPasswordReset).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveReset({ ok: true });
    });
  });
});
