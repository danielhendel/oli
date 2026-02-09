/**
 * Phase 2 proof test — Offline/error UX is fail-closed (no partial truth).
 *
 * Proves:
 * - FailClosed never renders children with error/partial status
 * - OfflineBanner renders only when isOffline
 * - Error/partial never show partial data
 */
import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator",
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

describe("Phase 2 proof: offline/error UX is fail-closed", () => {
  it("FailClosed: partial status never renders children", () => {
    const { FailClosed } = require("@/lib/ui/FailClosed");
    const childrenFn = jest.fn(() => <></>);

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <FailClosed
          outcome={{ status: "partial" }}
          loadingMessage="Loading…"
          children={childrenFn}
        />,
      );
    });

    expect(childrenFn).not.toHaveBeenCalled();
  });

  it("FailClosed: error status never renders children", () => {
    const { FailClosed } = require("@/lib/ui/FailClosed");
    const childrenFn = jest.fn(() => <></>);

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(
        <FailClosed
          outcome={{ status: "error", error: "err", requestId: null, reason: "network" }}
          onRetry={() => {}}
          children={childrenFn}
        />,
      );
    });

    expect(childrenFn).not.toHaveBeenCalled();
  });

  it("OfflineBanner: renders when isOffline, hidden when not", () => {
    const { OfflineBanner } = require("@/lib/ui/OfflineBanner");

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<OfflineBanner isOffline={false} />);
    });
    const textOff = collectAllText(test);
    expect(textOff).not.toContain("cached");

    act(() => {
      test.update(<OfflineBanner isOffline={true} />);
    });
    const textOn = collectAllText(test);
    expect(textOn).toContain("cached");
  });
});
