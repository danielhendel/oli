// app/(app)/(tabs)/library/replay/day/__tests__/replay-day-valid.test.tsx
// Sprint 5 — Replay screen renders in ready state with mocked runs + snapshot.

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

const mockRuns = {
  status: "ready" as const,
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
        trigger: { type: "realtime" as const, name: "onCanonicalEventCreated", eventId: "evt_1" },
        outputs: { hasDailyFacts: true, insightsCount: 2, hasIntelligenceContext: true },
        createdAt: "2026-02-08T12:00:00Z",
      },
    ],
  },
  refetch: jest.fn(),
};

const mockSnapshot = {
  status: "ready" as const,
  data: {
    day: "2026-02-08",
    runId: "run_1",
    computedAt: "2026-02-08T12:00:00Z",
    pipelineVersion: 1,
    trigger: { type: "realtime" as const, name: "onCanonicalEventCreated", eventId: "evt_1" },
    dailyFacts: {
      schemaVersion: 1,
      userId: "u1",
      date: "2026-02-08",
      computedAt: "2026-02-08T12:00:00Z",
      confidence: {},
    },
    insights: { day: "2026-02-08", count: 2, items: [] },
  },
  refetch: jest.fn(),
};

jest.mock("@/lib/data/useDerivedLedgerRuns", () => ({
  useDerivedLedgerRuns: () => mockRuns,
}));

jest.mock("@/lib/data/useDerivedLedgerSnapshot", () => ({
  useDerivedLedgerSnapshot: () => mockSnapshot,
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

describe("ReplayDayScreen valid render", () => {
  it("renders Replay title, day, and banner when given valid runs and snapshot", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<ReplayDayScreen />);
    });

    const text = collectAllText(test);
    expect(text).toContain("Replay");
    expect(text).toContain("2026-02-08");
    expect(text).toContain("Viewing past truth");
    expect(text).toContain("What is this?");
    expect(text).toContain("Derived truth");
    expect(text).toContain("Daily facts");
    expect(text).toContain("Present");
  });
});
