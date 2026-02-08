// app/(app)/(tabs)/library/replay/day/__tests__/replay-day-run-selection.test.tsx
// Sprint 5 — Run selection changes the requested runId (assert useDerivedLedgerSnapshot receives correct args).

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

const snapshotArgsLog: { day: string; runId?: string; asOf?: string }[] = [];

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
      {
        schemaVersion: 1,
        runId: "run_2",
        userId: "u1",
        date: "2026-02-08",
        computedAt: "2026-02-08T10:00:00Z",
        pipelineVersion: 1,
        trigger: { type: "scheduled" as const, name: "onDailyFactsRecompute", eventId: "evt_0" },
        outputs: { hasDailyFacts: true, insightsCount: 1, hasIntelligenceContext: false },
        createdAt: "2026-02-08T10:00:00Z",
      },
    ],
  },
  refetch: jest.fn(),
};

jest.mock("@/lib/data/useDerivedLedgerRuns", () => ({
  useDerivedLedgerRuns: () => mockRuns,
}));

jest.mock("@/lib/data/useDerivedLedgerSnapshot", () => ({
  useDerivedLedgerSnapshot: (args: { day: string; runId?: string; asOf?: string }) => {
    snapshotArgsLog.push({ ...args });
    return {
      status: "ready" as const,
      data: {
        day: args.day,
        runId: args.runId ?? "run_1",
        computedAt: "2026-02-08T12:00:00Z",
        pipelineVersion: 1,
        trigger: { type: "realtime" as const, name: "onCanonicalEventCreated", eventId: "evt_1" },
        refetch: jest.fn(),
      },
      refetch: jest.fn(),
    };
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReplayDayScreen = require("../[dayKey]").default;

describe("ReplayDayScreen run selection", () => {
  beforeEach(() => {
    snapshotArgsLog.length = 0;
  });

  it("calls useDerivedLedgerSnapshot with runId when run is selected", () => {
    act(() => {
      renderer.create(<ReplayDayScreen />);
    });

    expect(snapshotArgsLog.length).toBeGreaterThan(0);
    const lastArgs = snapshotArgsLog[snapshotArgsLog.length - 1];
    expect(lastArgs.day).toBe("2026-02-08");
    expect(lastArgs.runId).toBeDefined();
    expect(lastArgs.runId).toMatch(/^run_/);
  });

  it("passes run_2 when second run is pressed", () => {
    let tree!: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<ReplayDayScreen />);
    });

    const pressables = tree.root.findAllByType("Pressable");
    const run2Pressable = pressables.find((p) => {
      const textNodes = p.findAllByType("Text");
      const text = textNodes.map((n) => n.children?.join("")).join("");
      return text.includes("run_2");
    });

    if (run2Pressable?.props.onPress) {
      act(() => {
        run2Pressable.props.onPress();
      });
    }

    const callsWithRun2 = snapshotArgsLog.filter((a) => a.runId === "run_2");
    expect(callsWithRun2.length).toBeGreaterThan(0);
  });
});
