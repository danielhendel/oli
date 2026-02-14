// lib/ui/__tests__/BaselineDrawer.accessibility.test.tsx
// Phase 1.5 Sprint 6 — BaselineDrawer close and overlay accessibility

import React, { act } from "react";
import renderer from "react-test-renderer";
import { BaselineDrawer } from "../BaselineDrawer";
import type { HealthScoreDoc } from "@/lib/contracts";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Modal: "Modal",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s },
}));

const minimalDoc: HealthScoreDoc = {
  schemaVersion: 1,
  modelVersion: "1.0",
  date: "2026-02-14",
  compositeScore: 70,
  compositeTier: "good",
  domainScores: {
    recovery: { score: 72, tier: "good", missing: [] },
    training: { score: 68, tier: "good", missing: [] },
    nutrition: { score: 75, tier: "good", missing: [] },
    body: { score: 65, tier: "good", missing: [] },
  },
  status: "stable",
  computedAt: "2026-02-14T12:00:00.000Z",
  pipelineVersion: 1,
  inputs: { hasDailyFacts: true, historyDaysUsed: 7 },
};

describe("BaselineDrawer accessibility", () => {
  it("close button has accessibilityLabel and role", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <BaselineDrawer visible={true} onClose={jest.fn()} doc={minimalDoc} />
      );
    });
    const pressables = test.root.findAllByType("Pressable");
    const closeButton = pressables.find(
      (p) =>
        (p.props as { accessibilityLabel?: string }).accessibilityLabel === "Close baselines"
    );
    expect(closeButton).toBeDefined();
    expect((closeButton!.props as { accessibilityRole?: string }).accessibilityRole).toBe(
      "button"
    );
  });

  it("overlay has accessibilityLabel for dismiss", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <BaselineDrawer visible={true} onClose={jest.fn()} doc={minimalDoc} />
      );
    });
    const pressables = test.root.findAllByType("Pressable");
    const overlay = pressables.find(
      (p) =>
        (p.props as { accessibilityLabel?: string }).accessibilityLabel === "Dismiss baselines"
    );
    expect(overlay).toBeDefined();
  });
});
