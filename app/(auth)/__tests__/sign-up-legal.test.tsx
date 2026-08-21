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

jest.mock("@/lib/ui/legal/PublicDocumentLinks", () => {
  const ReactLocal = require("react");
  return {
    PublicDocumentLinks: ({
      kinds,
      intro,
      testID,
    }: {
      kinds?: string[];
      intro?: string;
      testID?: string;
    }) =>
      ReactLocal.createElement(
        "View",
        { testID: testID ?? "public-document-links" },
        ReactLocal.createElement("Text", null, intro ?? ""),
        ...(kinds ?? []).map((kind: string) =>
          ReactLocal.createElement("Text", { key: kind, testID: `${testID}-${kind}` }, kind),
        ),
      ),
  };
});

import SignUpScreen from "../sign-up";

describe("Sign up legal access (Stage 1A)", () => {
  it("exposes Privacy Policy and Terms without consent checkbox language", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<SignUpScreen />);
    });

    expect(test.root.findByProps({ testID: "sign-up-legal-links" })).toBeTruthy();
    const text = JSON.stringify(test.toJSON());
    expect(text).toContain("Review Oli");
    expect(text).toContain("privacyPolicy");
    expect(text).toContain("termsOfService");
    expect(text).not.toMatch(/by continuing|you agree|checkbox/i);
    expect(text).not.toContain("sign-up-legal-links-support");
  });

  it("keeps sign-up source free of invent-ed assent language and direct Firebase", () => {
    const src = fs.readFileSync(path.join(__dirname, "../sign-up.tsx"), "utf8");
    expect(src).toContain("PublicDocumentLinks");
    expect(src).not.toMatch(/By continuing, you legally agree/);
    expect(src).not.toMatch(/sendPasswordResetEmail|getFirestore/);
  });
});
