import React from "react";
import renderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockUseUserProfileMain = jest.fn();
const mockBack = jest.fn();
let mockFieldParam = "waistCircumferenceCm";

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
  useLocalSearchParams: () => ({ field: mockFieldParam }),
  useNavigation: () => ({ setOptions: jest.fn() }),
  useRouter: () => ({ back: mockBack }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ProfileFieldEditorScreen = require("../[field]").default as React.ComponentType;

describe("ProfileFieldEditorScreen legacy waist deprecation", () => {
  beforeEach(() => {
    mockUseUserProfileMain.mockReset();
    mockBack.mockReset();
    mockFieldParam = "waistCircumferenceCm";
    mockUseUserProfileMain.mockReturnValue({
      state: { status: "ready", profile: null },
      patch: jest.fn(async () => true),
    });
  });

  it.each(["waist", "waistCircumferenceCm", "waist_circumference"] as const)(
    "fail-closes direct edit route for %s",
    (field) => {
      mockFieldParam = field;
      let tree!: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(<ProfileFieldEditorScreen />);
      });
      expect(tree.root.findByProps({ testID: "profile-edit-waist-deprecated" })).toBeTruthy();
      expect(tree.root.findByProps({ testID: "profile-edit-waist-deprecated-back" })).toBeTruthy();
      act(() => {
        tree.unmount();
      });
    },
  );

  it("still allows other circumference fields (hip)", () => {
    mockFieldParam = "hip";
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ProfileFieldEditorScreen />);
    });
    expect(() =>
      tree.root.findByProps({ testID: "profile-edit-waist-deprecated" }),
    ).toThrow();
    act(() => {
      tree.unmount();
    });
  });
});
