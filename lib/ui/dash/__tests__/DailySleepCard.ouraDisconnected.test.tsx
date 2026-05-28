import React, { act } from "react";
import { Pressable, Text } from "react-native";
import renderer from "react-test-renderer";

import type { DailySleepCardViewModel } from "@/lib/data/dash/dailySleepCardViewModel";
import { DailySleepCard } from "@/lib/ui/dash/DailySleepCard";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

function ouraDisconnectedMissingVm(): DailySleepCardViewModel {
  return {
    status: "missing",
    day: "2026-05-26",
    message: "Reconnect Oura to sync your sleep.",
    reason: "oura_disconnected",
    cta: { label: "Reconnect Oura \u2192", href: "/(app)/settings/devices/oura" },
  };
}

function connectedMissingVm(): DailySleepCardViewModel {
  return {
    status: "missing",
    day: "2026-05-26",
    message: "No sleep data logged for this day.",
    reason: "no_data",
  };
}

function allVisibleText(root: renderer.ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map((t) => {
      const ch = t.props.children;
      if (typeof ch === "string") return ch;
      if (Array.isArray(ch)) return ch.filter((x): x is string => typeof x === "string").join("");
      return "";
    })
    .join("|");
}

describe("DailySleepCard — ouraDisconnected", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders reconnect message and CTA when reason is oura_disconnected", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailySleepCard vm={ouraDisconnectedMissingVm()} />);
    });
    const flat = allVisibleText(root.root);
    expect(flat).toContain("Reconnect Oura to sync your sleep.");
    expect(flat).toContain("Reconnect Oura \u2192");
    expect(root.root.findByProps({ testID: "daily-sleep-oura-reconnect-cta" })).toBeTruthy();
  });

  it("navigates to Oura device settings when CTA is pressed", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailySleepCard vm={ouraDisconnectedMissingVm()} />);
    });
    const cta = root.root.findByProps({ testID: "daily-sleep-oura-reconnect-cta" });
    act(() => {
      cta.findByType(Pressable).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/settings/devices/oura");
  });

  it("does not render reconnect CTA for connected missing state", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<DailySleepCard vm={connectedMissingVm()} />);
    });
    const flat = allVisibleText(root.root);
    expect(flat).toContain("No sleep data logged");
    expect(flat).not.toContain("Reconnect Oura \u2192");
    expect(root.root.findAllByProps({ testID: "daily-sleep-oura-reconnect-cta" })).toHaveLength(0);
  });

  it("does not render reconnect CTA while partial", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <DailySleepCard vm={{ status: "partial", day: "2026-05-26" }} />,
      );
    });
    expect(root.root.findAllByProps({ testID: "daily-sleep-oura-reconnect-cta" })).toHaveLength(0);
    expect(allVisibleText(root.root)).toContain("Loading");
  });
});
