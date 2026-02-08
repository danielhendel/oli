// app/(app)/(tabs)/library/lineage/__tests__/lineage-screen-valid.test.tsx
// Sprint 4 — Lineage screen renders when given valid mocked lineage.

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
    status: "ready",
    data: {
      rawEventIds: ["raw_1"],
      canonicalEventId: "evt_123",
      derivedLedgerRuns: [
        { day: "2025-01-15", runId: "run_1", computedAt: "2025-01-15T12:00:00Z" },
      ],
    },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useEvents", () => ({
  useEvents: () => ({
    status: "ready",
    data: {
      items: [
        {
          id: "evt_123",
          userId: "u1",
          sourceId: "manual",
          kind: "weight",
          start: "2025-01-15T10:00:00Z",
          end: "2025-01-15T10:00:00Z",
          day: "2025-01-15",
          timezone: "America/New_York",
          createdAt: "2025-01-15T10:00:00Z",
          updatedAt: "2025-01-15T10:00:00Z",
          schemaVersion: 1,
        },
      ],
      nextCursor: null,
    },
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

describe("LineageScreen valid render", () => {
  it("renders Canonical Event and Raw Events sections when given valid lineage", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<LineageScreen />);
    });

    const text = collectAllText(test);
    expect(text).toContain("Lineage");
    expect(text).toContain("Canonical Event");
    expect(text).toContain("Raw Events");
    expect(text).toContain("weight");
    expect(text).toContain("raw_1");
  });
});
