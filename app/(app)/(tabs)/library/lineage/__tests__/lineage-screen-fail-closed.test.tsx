// app/(app)/(tabs)/library/lineage/__tests__/lineage-screen-fail-closed.test.tsx
// Sprint 4 — Fail-closed: ApiFailure kind:"contract" shows ErrorState, no partial sections.

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
  useLocalSearchParams: () => ({ canonicalEventId: "evt_123" }),
}));

jest.mock("@/lib/data/useLineage", () => ({
  useLineage: () => ({
    status: "error",
    error: "Invalid response shape",
    requestId: "req-456",
    reason: "contract",
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useEvents", () => ({
  useEvents: () => ({
    status: "ready",
    data: { items: [], nextCursor: null },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useFailures", () => ({
  useFailures: () => ({
    status: "ready",
    data: { items: [] },
    refetch: jest.fn(),
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LineageScreen = require("../[canonicalEventId]").default;

function collectAllText(test: renderer.ReactTestRenderer): string {
  const nodes = test.root.findAllByType("Text");
  const parts: string[] = [];
  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number")
        parts.push(String(child));
    }
  }
  return parts.join(" ");
}

describe("LineageScreen fail-closed", () => {
  it("renders ErrorState with Data validation failed when API returns contract error", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<LineageScreen />);
    });

    const text = collectAllText(test);
    expect(text).toContain("Data validation failed");
    expect(text).toContain("Try again");
    expect(text).not.toContain("Canonical Event");
    expect(text).not.toContain("Raw Events");
  });
});
