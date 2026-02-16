/**
 * Settings index — Devices row: in dev it is enabled and navigates to settings/devices; in non-dev it stays disabled with Soon.
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s },
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Use real sections and readiness so Devices comes from getModuleSections and getSectionReadiness("settings.devices") returns Soon
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SettingsHomeScreen = require("../index").default;

function findDevicesPressable(root: renderer.ReactTestInstance): renderer.ReactTestInstance | null {
  const textNodes = root.findAllByType("Text");
  const devicesText = textNodes.find((n) => n.children && n.children.indexOf("Devices") !== -1);
  if (!devicesText || !devicesText.parent) return null;
  const leftView = devicesText.parent;
  if (!leftView.parent) return null;
  return leftView.parent as renderer.ReactTestInstance;
}

describe("SettingsHomeScreen Devices row", () => {
  const originalDev = (global as unknown as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    (global as unknown as { __DEV__?: boolean }).__DEV__ = originalDev;
    mockPush.mockClear();
  });

  it("in dev mode renders Devices as enabled and pressing navigates to settings/devices", () => {
    (global as unknown as { __DEV__?: boolean }).__DEV__ = true;

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<SettingsHomeScreen />);
    });

    const pressable = findDevicesPressable(test.root);
    expect(pressable).not.toBeNull();
    expect(pressable?.props.disabled).toBe(false);

    act(() => {
      pressable?.props.onPress?.();
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/(app)/settings/devices");
  });

  it("in non-dev mode renders Devices as disabled", () => {
    (global as unknown as { __DEV__?: boolean }).__DEV__ = false;

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<SettingsHomeScreen />);
    });

    const pressable = findDevicesPressable(test.root);
    expect(pressable).not.toBeNull();
    expect(pressable?.props.disabled).toBe(true);
  });
});
