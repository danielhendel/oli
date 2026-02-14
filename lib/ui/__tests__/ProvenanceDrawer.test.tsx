// lib/ui/__tests__/ProvenanceDrawer.test.tsx
// Phase 1.5 Sprint 5 — Epistemic transparency: ProvenanceDrawer UI guard

import React, { act } from "react";
import renderer from "react-test-renderer";
import { ProvenanceDrawer } from "../ProvenanceDrawer";
import type { ProvenanceViewModel } from "@/lib/contracts/provenance";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Modal: "Modal",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s },
}));

function collectAllText(test: renderer.ReactTestRenderer): string {
  const nodes = test.root.findAllByType("Text");
  const parts: string[] = [];
  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    }
  }
  return parts.join(" ");
}

describe("ProvenanceDrawer", () => {
  const baseModel: ProvenanceViewModel = {
    title: "Test provenance",
    modelVersion: "1.0",
    computedAt: "2026-02-14T12:00:00.000Z",
    pipelineVersion: 2,
    missingInputs: [],
    derivedFromLabel: "Derived from DailyFacts",
  };

  const noop = jest.fn();

  it("renders Model Version and Computed At", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ProvenanceDrawer visible={true} onClose={noop} model={baseModel} />,
      );
    });
    const text = collectAllText(test);
    expect(text).toContain("Model Version");
    expect(text).toContain("1.0");
    expect(text).toContain("Computed At");
    expect(text).toContain("2026"); // formatted date contains year
  });

  it("renders Missing Inputs list when present", () => {
    const modelWithMissing: ProvenanceViewModel = {
      ...baseModel,
      missingInputs: ["sleep", "steps"],
    };
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ProvenanceDrawer visible={true} onClose={noop} model={modelWithMissing} />,
      );
    });
    const text = collectAllText(test);
    expect(text).toContain("Missing Inputs");
    expect(text).toContain("sleep");
    expect(text).toContain("steps");
  });

  it("renders Thresholds section only when thresholds provided", () => {
    const modelWithThresholds: ProvenanceViewModel = {
      ...baseModel,
      thresholds: {
        compositeAttentionLt: 50,
        domainAttentionLt: 40,
        deviationAttentionPctLt: 20,
      },
    };
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ProvenanceDrawer visible={true} onClose={noop} model={modelWithThresholds} />,
      );
    });
    const text = collectAllText(test);
    expect(text).toContain("Thresholds used");
    expect(text).toContain("50");
    expect(text).toContain("40");
    expect(text).toContain("20");
  });

  it("does not render thresholds section when thresholds not provided", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ProvenanceDrawer visible={true} onClose={noop} model={baseModel} />,
      );
    });
    const text = collectAllText(test);
    expect(text).not.toContain("Thresholds used");
  });

  it("does not render raw JSON blocks (no curly braces as content)", () => {
    const modelWithMissing: ProvenanceViewModel = {
      ...baseModel,
      missingInputs: ["sleep"],
    };
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ProvenanceDrawer visible={true} onClose={noop} model={modelWithMissing} />,
      );
    });
    const text = collectAllText(test);
    // User-visible text must not contain raw JSON dumps
    expect(text).not.toMatch(/\{\s*[\s\S]*\}/);
  });

  it("does not display path-like strings (users/, firestore, projects/)", () => {
    const modelPathLike: ProvenanceViewModel = {
      ...baseModel,
      missingInputs: ["someInput"],
      derivedFromLabel: "Derived from DailyFacts",
    };
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ProvenanceDrawer visible={true} onClose={noop} model={modelPathLike} />,
      );
    });
    const text = collectAllText(test);
    expect(text).not.toContain("users/");
    expect(text).not.toContain("firestore");
    expect(text).not.toContain("projects/");
  });

  it("close button has accessibilityLabel and role for screen readers", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <ProvenanceDrawer visible={true} onClose={noop} model={baseModel} />,
      );
    });
    const pressables = test.root.findAllByType("Pressable");
    const closeButton = pressables.find(
      (p) =>
        (p.props as { accessibilityLabel?: string }).accessibilityLabel ===
        "Close provenance details"
    );
    expect(closeButton).toBeDefined();
    expect((closeButton!.props as { accessibilityRole?: string }).accessibilityRole).toBe(
      "button"
    );
  });
});
