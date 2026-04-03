import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
const mockUseUserProfileMain = jest.fn();

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => mockUseUserProfileMain(),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: { units: { mass: "lb" as const } } },
    setMassUnit: jest.fn(async () => undefined),
  }),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ field: "preferred_units" }),
  useNavigation: () => ({ setOptions: jest.fn() }),
  useRouter: () => ({ back: jest.fn() }),
}));

function collectText(node: renderer.ReactTestInstance | string | null | undefined): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  const inst = node as renderer.ReactTestInstance;
  return (inst.children ?? []).map((c) => collectText(c as renderer.ReactTestInstance | string)).join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ProfileFieldEditorScreen = require("../[field]").default as React.ComponentType;

describe("ProfileFieldEditorScreen profile state", () => {
  beforeEach(() => {
    mockUseUserProfileMain.mockReset();
  });

  it("renders preferred units immediately when GET failed with no cached profile (no Loading profile)", () => {
    mockUseUserProfileMain.mockReturnValue({
      state: {
        status: "error",
        profile: null,
        message: "HTTP 404 (kind=http, status=404)",
      },
      patch: jest.fn(async () => true),
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProfileFieldEditorScreen />);
    });
    const text = collectText(tree.root);
    expect(text).not.toContain("Loading profile");
    expect(text).toContain("Weight display");
    expect(text).toContain("Length / height entry");
    act(() => {
      tree.unmount();
    });
  });

  it("renders with defaults while partial and server profile not yet received", () => {
    mockUseUserProfileMain.mockReturnValue({
      state: { status: "partial", profile: null },
      patch: jest.fn(async () => true),
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProfileFieldEditorScreen />);
    });
    const text = collectText(tree.root);
    expect(text).not.toContain("Loading profile");
    expect(text).toContain("Pounds (lb)");
    act(() => {
      tree.unmount();
    });
  });

  it("renders preferred units when ready with null profile (no doc yet)", () => {
    mockUseUserProfileMain.mockReturnValue({
      state: { status: "ready", profile: null },
      patch: jest.fn(async () => true),
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProfileFieldEditorScreen />);
    });
    const text = collectText(tree.root);
    expect(text).not.toContain("Sign in to edit your profile");
    expect(text).toContain("Weight display");
    act(() => {
      tree.unmount();
    });
  });

  it("shows sign-in copy when profile user is missing", () => {
    mockUseUserProfileMain.mockReturnValue({
      state: { status: "missing" },
      patch: jest.fn(async () => false),
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProfileFieldEditorScreen />);
    });
    const text = collectText(tree.root);
    expect(text).toContain("Sign in to edit your profile");
    act(() => {
      tree.unmount();
    });
  });
});
