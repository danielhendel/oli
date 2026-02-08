// lib/ui/__tests__/ScreenStates.test.tsx
// Sprint 3 — Fail-closed: ErrorState with contract error must show user-friendly message.

import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ErrorState, LoadingState, EmptyState } = require("../ScreenStates") as typeof import("../ScreenStates");

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

describe("ErrorState", () => {
  it("renders Data validation failed when isContractError=true (fail-closed)", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(
        <ErrorState
          message="Invalid response shape"
          isContractError={true}
        />,
      );
    });

    const text = collectAllText(test);
    expect(text).toContain("Data validation failed");
    expect(text.toLowerCase()).toContain("try again");
  });

  it("renders generic title when isContractError=false", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(
        <ErrorState
          message="Network error"
          isContractError={false}
        />,
      );
    });

    const text = collectAllText(test);
    expect(text).toContain("Something went wrong");
  });
});

describe("LoadingState", () => {
  it("renders loading message", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<LoadingState message="Loading…" />);
    });

    const text = collectAllText(test);
    expect(text).toContain("Loading…");
  });
});

describe("EmptyState", () => {
  it("renders title and description", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(
        <EmptyState title="No events" description="No events yet." />,
      );
    });

    const text = collectAllText(test);
    expect(text).toContain("No events");
    expect(text).toContain("No events yet.");
  });
});
