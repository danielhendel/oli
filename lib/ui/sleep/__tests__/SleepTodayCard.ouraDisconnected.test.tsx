import React from "react";
import renderer, { act } from "react-test-renderer";
import { Pressable } from "react-native";
import { describe, expect, it } from "@jest/globals";

import type { SleepTodayDetailVm } from "@/lib/data/sleep/buildSleepTodayDetailVm";
import { SleepTodayCard } from "@/lib/ui/sleep/SleepTodayCard";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("SleepTodayCard — ouraDisconnected", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders reconnect message and CTA when reason is oura_disconnected", async () => {
    const model: SleepTodayDetailVm = {
      status: "missing",
      day: "2026-05-26",
      message: "Reconnect Oura to sync your sleep.",
      reason: "oura_disconnected",
      cta: { label: "Reconnect Oura \u2192", href: "/(app)/settings/devices/oura" },
    };

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepTodayCard model={model} />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Reconnect Oura to sync your sleep.");
    expect(json).toContain("Reconnect Oura \u2192");
    expect(tree.root.findByProps({ testID: "sleep-today-oura-reconnect-cta" })).toBeTruthy();
  });

  it("navigates to Oura device settings when CTA is pressed", async () => {
    const model: SleepTodayDetailVm = {
      status: "missing",
      day: "2026-05-26",
      message: "Reconnect Oura to sync your sleep.",
      reason: "oura_disconnected",
      cta: { label: "Reconnect Oura \u2192", href: "/(app)/settings/devices/oura" },
    };

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepTodayCard model={model} />);
    });
    const cta = tree.root.findByProps({ testID: "sleep-today-oura-reconnect-cta" });
    await act(async () => {
      cta.findByType(Pressable).props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/settings/devices/oura");
  });

  it("does not render reconnect CTA for connected missing state", async () => {
    const model: SleepTodayDetailVm = {
      status: "missing",
      day: "2026-05-26",
      message: "No completed sleep found for this day.",
      reason: "no_data",
    };

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<SleepTodayCard model={model} />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("No completed sleep found for this day.");
    expect(json).not.toContain("Reconnect Oura \u2192");
    expect(tree.root.findAllByProps({ testID: "sleep-today-oura-reconnect-cta" })).toHaveLength(0);
  });

  it("does not render reconnect CTA while partial", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <SleepTodayCard model={{ status: "partial", day: "2026-05-26" }} />,
      );
    });
    expect(tree.root.findAllByProps({ testID: "sleep-today-oura-reconnect-cta" })).toHaveLength(0);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Loading sleep");
  });
});
