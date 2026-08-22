import React, { act } from "react";
import renderer from "react-test-renderer";
import fs from "node:fs";
import path from "node:path";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock("@/lib/auth/actions", () => ({
  signUpWithEmail: jest.fn(),
}));

jest.mock("@/lib/linking/openPublicLink", () => ({
  openPublicLink: jest.fn(),
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  Alert: { alert: jest.fn() },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

import SignUpScreen from "../sign-up";
import { PublicDocumentLinks } from "@/lib/ui/legal/PublicDocumentLinks";
import type { PublicLinksSnapshot } from "@/lib/config/publicLinks";

const missingLinks: PublicLinksSnapshot = {
  privacyPolicy: { status: "unavailable", reason: "missing" },
  termsOfService: { status: "unavailable", reason: "missing" },
  support: { status: "unavailable", reason: "missing" },
};

const configuredLinks: PublicLinksSnapshot = {
  privacyPolicy: { status: "configured", url: "https://docs.oli.health/privacy" },
  termsOfService: { status: "configured", url: "https://docs.oli.health/terms" },
  support: { status: "unavailable", reason: "missing" },
};

describe("Sign up legal access (Stage 1A)", () => {
  it("keeps Create account usable on Sign Up screen", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<SignUpScreen />);
    });
    expect(test.root.findByProps({ testID: "sign-up-screen" })).toBeTruthy();
    expect(JSON.stringify(test.toJSON())).toContain("Create account");
  });

  it("exposes Privacy Policy and Terms via PublicDocumentLinks when configured", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <PublicDocumentLinks
          kinds={["privacyPolicy", "termsOfService"]}
          intro="Review Oli’s Privacy Policy and Terms of Service."
          testID="sign-up-legal-links"
          links={configuredLinks}
        />,
      );
    });

    expect(test.root.findByProps({ testID: "sign-up-legal-links" })).toBeTruthy();
    const text = JSON.stringify(test.toJSON());
    expect(text).toContain("Review Oli");
    expect(text).toContain("Privacy Policy");
    expect(text).toContain("Terms of Service");
    expect(text).not.toMatch(/by continuing|you agree|checkbox/i);
  });

  it("omits legal link actions when URLs are unavailable (RG-LEGAL-01 open)", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <PublicDocumentLinks
          kinds={["privacyPolicy", "termsOfService"]}
          intro="Review Oli’s Privacy Policy and Terms of Service."
          testID="sign-up-legal-links"
          links={missingLinks}
        />,
      );
    });

    expect(test.toJSON()).toBeNull();
  });

  it("keeps sign-up source free of invent-ed assent language and direct Firebase", () => {
    const src = fs.readFileSync(path.join(__dirname, "../sign-up.tsx"), "utf8");
    expect(src).toContain("PublicDocumentLinks");
    expect(src).not.toMatch(/By continuing, you legally agree/);
    expect(src).not.toMatch(/sendPasswordResetEmail|getFirestore/);
  });
});
