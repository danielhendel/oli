import React from "react";
import renderer, { act } from "react-test-renderer";

import { defaultUserProfileMain } from "@oli/contracts";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

import { ProfileMainScreen } from "../ProfileMainScreen";
import type { ProfileHealthSummaryResult } from "@/lib/features/profile/useProfileHealthSummary";

function collectText(node: renderer.ReactTestInstance | string | null | undefined): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const inst = node as renderer.ReactTestInstance;
  return (inst.children ?? []).map((c) => collectText(c as renderer.ReactTestInstance | string)).join(" ");
}

function findAccessibilityLabels(root: renderer.ReactTestInstance): string[] {
  const out: string[] = [];
  const walk = (n: renderer.ReactTestInstance) => {
    const label = n.props?.accessibilityLabel;
    if (typeof label === "string" && label.length > 0) out.push(label);
    for (const c of n.children ?? []) {
      if (c != null && typeof c !== "string") walk(c as renderer.ReactTestInstance);
    }
  };
  walk(root);
  return out;
}

const MOCK_HEALTH_SIGNED_OUT: ProfileHealthSummaryResult = {
  categories: [],
  coverageSummaryLine: null,
  signedOut: true,
};

describe("ProfileMainScreen", () => {
  it("digital twin layout, Identity rows, tab-root title, and no settings gear", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ProfileMainScreen
          profile={defaultUserProfileMain()}
          status="ready"
          massUnit="lb"
          health={MOCK_HEALTH_SIGNED_OUT}
        />,
      );
    });

    const text = collectText(tree.root);
    const a11y = findAccessibilityLabels(tree.root);

    expect(text).toContain("Profile");
    expect(text).toContain("Your digital twin — all collected health and fitness data in one place.");
    expect(text).toContain("Health data");
    expect(text).toContain("Identity");
    expect(a11y).not.toContain("Settings");

    expect(text).not.toContain("Couldn’t load profile");
    expect(text).not.toContain("Devices");
    expect(text).not.toContain("Data sources");
    expect(text).not.toContain("Account");
    expect(text).not.toContain("Privacy");

    expect(text).not.toContain("Body inputs");
    expect(text).not.toContain("Category inputs");
    expect(text).not.toContain("Athlete mode");

    expect(text).toContain("First name");

    act(() => {
      tree.unmount();
    });
  });

  it("does not render suppressed HTTP 404 error text even if props pass status error", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ProfileMainScreen
          profile={defaultUserProfileMain()}
          status="error"
          errorMessage="HTTP 404 (kind=http, status=404)"
          massUnit="lb"
          health={MOCK_HEALTH_SIGNED_OUT}
        />,
      );
    });
    const text = collectText(tree.root);
    expect(text).not.toContain("HTTP 404");
    expect(text).toContain("First name");
    act(() => {
      tree.unmount();
    });
  });

  it("renders non-404 error text when status is error", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ProfileMainScreen
          profile={defaultUserProfileMain()}
          status="error"
          errorMessage="HTTP 503 (kind=http, status=503)"
          massUnit="lb"
          health={MOCK_HEALTH_SIGNED_OUT}
        />,
      );
    });
    const text = collectText(tree.root);
    expect(text).toContain("HTTP 503");
    act(() => {
      tree.unmount();
    });
  });
});
