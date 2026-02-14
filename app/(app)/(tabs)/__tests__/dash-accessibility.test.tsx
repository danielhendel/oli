// app/(app)/(tabs)/__tests__/dash-accessibility.test.tsx
// Phase 1.5 Sprint 6 — UX Integrity: accessibility labels and roles on Dash interactive elements

import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Modal: "Modal",
  StyleSheet: { create: (s: unknown) => s },
  ActivityIndicator: "ActivityIndicator",
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/time/dayKey", () => ({
  getTodayDayKey: () => "2026-02-14",
}));

const minimalHealthScoreDoc = {
  schemaVersion: 1 as const,
  modelVersion: "1.0" as const,
  date: "2026-02-14",
  compositeScore: 70,
  compositeTier: "good" as const,
  domainScores: {
    recovery: { score: 72, tier: "good" as const, missing: [] },
    training: { score: 68, tier: "good" as const, missing: [] },
    nutrition: { score: 75, tier: "good" as const, missing: [] },
    body: { score: 65, tier: "good" as const, missing: [] },
  },
  status: "stable" as const,
  computedAt: "2026-02-14T12:00:00.000Z",
  pipelineVersion: 1,
  inputs: { hasDailyFacts: true, historyDaysUsed: 7 },
};

const minimalHealthSignalDoc = {
  schemaVersion: 1 as const,
  modelVersion: "1.0" as const,
  date: "2026-02-14",
  status: "stable" as const,
  readiness: "ready" as const,
  computedAt: "2026-02-14T12:00:00.000Z",
  pipelineVersion: 1,
  inputs: {
    healthScoreDayKey: "2026-02-14",
    baselineWindowDays: 14,
    baselineDaysPresent: 14,
    thresholds: {
      compositeAttentionLt: 50,
      domainAttentionLt: 40,
      deviationAttentionPctLt: 20,
    },
  },
  reasons: [] as string[],
  missingInputs: [] as string[],
  domainEvidence: {
    recovery: { score: 72, baselineMean: 70, deviationPct: 2 },
    training: { score: 68, baselineMean: 65, deviationPct: 4 },
    nutrition: { score: 75, baselineMean: 72, deviationPct: null },
    body: { score: 65, baselineMean: 68, deviationPct: -4 },
  },
};

jest.mock("@/lib/data/useFailuresRange", () => ({
  useFailuresRange: () => ({
    status: "ready",
    data: { items: [], nextCursor: null, truncated: false },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useUploadsPresence", () => ({
  useUploadsPresence: () => ({
    status: "ready",
    data: { count: 0, latest: null },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useTimeline", () => ({
  useTimeline: () => ({
    status: "ready",
    data: { days: [{ dayKey: "2026-02-14", canonicalCount: 5 }] },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useHealthScore", () => ({
  useHealthScore: () => ({
    status: "ready",
    data: minimalHealthScoreDoc,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useHealthSignals", () => ({
  useHealthSignals: () => ({
    status: "ready",
    data: minimalHealthSignalDoc,
    refetch: jest.fn(),
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const DashScreen = require("../dash").default;

function findPressablesWithLabel(
  root: renderer.ReactTestInstance,
  label: string
): renderer.ReactTestInstance[] {
  const pressables = root.findAllByType("Pressable");
  return pressables.filter(
    (p) => (p.props as { accessibilityLabel?: string }).accessibilityLabel === label
  );
}

describe("Dash accessibility", () => {
  it("exposes accessibilityLabel on View baselines trigger", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const viewBaselines = findPressablesWithLabel(test.root, "View baselines");
    expect(viewBaselines.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes accessibilityLabel on Health Score Details trigger", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const details = findPressablesWithLabel(
      test.root,
      "Health Score details and provenance"
    );
    expect(details.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes accessibilityLabel on Analyze trigger", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const analyze = findPressablesWithLabel(
      test.root,
      "Analyze signals and view provenance"
    );
    expect(analyze.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes accessibilityLabel on View failures action", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const viewFailures = findPressablesWithLabel(test.root, "View failures");
    expect(viewFailures.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes accessibilityRole button on main actions", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const pressables = test.root.findAllByType("Pressable");
    const withRole = pressables.filter(
      (p) => (p.props as { accessibilityRole?: string }).accessibilityRole === "button"
    );
    expect(withRole.length).toBeGreaterThanOrEqual(4);
  });
});
