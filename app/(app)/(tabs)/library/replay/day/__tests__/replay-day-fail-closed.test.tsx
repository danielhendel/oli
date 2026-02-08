// app/(app)/(tabs)/library/replay/day/__tests__/replay-day-fail-closed.test.tsx
// Sprint 5 — Contract error => ErrorState "Data validation failed", no partial content.

import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  Pressable: "Pressable",
  Modal: "Modal",
  TextInput: "TextInput",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ dayKey: "2026-02-08" }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/data/useDerivedLedgerRuns", () => ({
  useDerivedLedgerRuns: () => ({
    status: "ready",
    data: {
      day: "2026-02-08",
      latestRunId: "run_1",
      runs: [
        {
          schemaVersion: 1,
          runId: "run_1",
          userId: "u1",
          date: "2026-02-08",
          computedAt: "2026-02-08T12:00:00Z",
          pipelineVersion: 1,
          trigger: { type: "realtime", name: "onCanonicalEventCreated", eventId: "evt_1" },
          outputs: { hasDailyFacts: true, insightsCount: 0, hasIntelligenceContext: false },
          createdAt: "2026-02-08T12:00:00Z",
        },
      ],
    },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useDerivedLedgerSnapshot", () => ({
  useDerivedLedgerSnapshot: () => ({
    status: "error",
    error: "Invalid response shape — Zod validation failed",
    requestId: "req-456",
    refetch: jest.fn(),
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReplayDayScreen = require("../[dayKey]").default;

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

describe("ReplayDayScreen fail-closed", () => {
  it("renders ErrorState with Data validation failed when snapshot returns contract error", () => {
    jest.resetModules();
    jest.doMock("@/lib/data/useDerivedLedgerSnapshot", () => ({
      useDerivedLedgerSnapshot: () => ({
        status: "error",
        error: "Invalid response shape — Zod validation failed",
        requestId: "req-456",
        refetch: jest.fn(),
      }),
    }));

    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<ReplayDayScreen />);
    });

    const text = collectAllText(test);
    expect(text).toContain("Data validation failed");
    expect(text).toContain("Try again");
    expect(text).not.toContain("Derived truth");
    expect(text).not.toContain("Viewing past truth");
  });
});
