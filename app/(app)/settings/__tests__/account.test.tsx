import React, { act } from "react";
import renderer from "react-test-renderer";
import fs from "node:fs";
import path from "node:path";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

const mockPush = jest.fn();
const mockSignOut = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "firebase-uid-must-not-render", email: "member@example.com" },
    initializing: false,
    signOut: mockSignOut,
    signOutUser: mockSignOut,
    getIdToken: jest.fn(),
  }),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Alert: { alert: jest.fn() },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

import SettingsAccountScreen from "../account";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

function collectText(test: renderer.ReactTestRenderer): string {
  const nodes = test.root.findAllByType("Text");
  const parts: string[] = [];
  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    }
  }
  return parts.join(" ");
}

describe("Account screen", () => {
  it("uses readable status copy and does not expose Firebase UID or route labels", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<SettingsAccountScreen />);
    });
    const text = collectText(test);
    expect(text).toContain("Signed in");
    expect(text).toContain("member@example.com");
    expect(text).not.toContain("firebase-uid-must-not-render");
    expect(text).not.toMatch(/\bUID\b/);
    expect(text).not.toContain("settings/account");

    const panel = test.root.findByProps({ testID: "account-status-panel" });
    const title = test.root.findAllByType("Text").find((n) => n.children.includes("Status"));
    expect(title?.props.style).toEqual(expect.objectContaining({ color: UI_TEXT_PRIMARY }));
    expect(panel).toBeTruthy();
  });

  it("registers a consumer stack title in the app layout", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../_layout.tsx"), "utf8");
    expect(src).toMatch(/name="settings\/account"/);
    expect(src).toMatch(/name="settings\/delete-account"/);
    expect(src).toMatch(/title:\s*"Account"/);
  });

  it("exposes Delete Account entry when signed in", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<SettingsAccountScreen />);
    });
    const text = collectText(test);
    expect(text).toContain("Delete Account");
  });
});
