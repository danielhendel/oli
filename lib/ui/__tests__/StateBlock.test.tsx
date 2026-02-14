// lib/ui/__tests__/StateBlock.test.tsx
// Phase 1.5 Sprint 6 — State unification: OfflineState explicit block

import React, { act } from "react";
import renderer from "react-test-renderer";
import { OfflineState } from "../StateBlock";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s },
}));

function collectText(root: renderer.ReactTestInstance): string {
  const parts: string[] = [];
  root.findAllByType("Text").forEach((n) => {
    n.children.forEach((c) => {
      if (typeof c === "string" || typeof c === "number") parts.push(String(c));
    });
  });
  return parts.join(" ");
}

describe("StateBlock", () => {
  describe("OfflineState", () => {
    it("renders title and message", () => {
      let test!: renderer.ReactTestRenderer;
      act(() => {
        test = renderer.create(
          <OfflineState
            title="Offline"
            message="Content will load when connection is restored."
          />
        );
      });
      const text = collectText(test.root);
      expect(text).toContain("Offline");
      expect(text).toContain("Content will load when connection is restored.");
    });

    it("does not rely on color-only meaning (has visible text)", () => {
      let test!: renderer.ReactTestRenderer;
      act(() => {
        test = renderer.create(
          <OfflineState title="No connection" message="Try again later." />
        );
      });
      const text = collectText(test.root);
      expect(text.trim().length).toBeGreaterThan(0);
    });
  });
});
