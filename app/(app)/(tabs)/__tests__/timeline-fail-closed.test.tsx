// app/(app)/(tabs)/__tests__/timeline-fail-closed.test.tsx
// Sprint 3 — Fail-closed: ApiFailure kind:"contract" must render ErrorState, not list.

import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  Pressable: "Pressable",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/data/useTimeline", () => ({
  useTimeline: () => ({
    status: "error",
    error: "Invalid response shape",
    requestId: "req-123",
    refetch: jest.fn(),
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TimelineIndexScreen = require("../timeline/index").default;

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

describe("TimelineIndexScreen fail-closed", () => {
  it("renders ErrorState with Data validation failed when API returns contract error", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<TimelineIndexScreen />);
    });

    const text = collectAllText(test);
    expect(text).toContain("Data validation failed");
    expect(text).toContain("Try again");
    expect(text).not.toContain("2025-01-01");
  });
});
