// app/(app)/(tabs)/__tests__/dash-provenance.test.tsx
// Phase 1.5 Sprint 5 — Dash exposes Details (Health Score) and Analyze (Signals) and opens ProvenanceDrawer

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

function findPressableWithText(test: renderer.ReactTestRenderer, text: string): renderer.ReactTestInstance | null {
  const pressables = test.root.findAllByType("Pressable");
  for (const p of pressables) {
    const str = collectTextUnder(p);
    if (str.includes(text)) return p;
  }
  return null;
}

function collectTextUnder(node: renderer.ReactTestInstance): string {
  const parts: string[] = [];
  const visit = (n: renderer.ReactTestInstance) => {
    if (n.type === "Text") {
      for (const c of n.children) {
        if (typeof c === "string" || typeof c === "number") parts.push(String(c));
      }
    }
    n.children.forEach((c) => {
      if (typeof c === "object" && c !== null && "children" in c) visit(c as renderer.ReactTestInstance);
    });
  };
  visit(node);
  return parts.join(" ");
}

describe("Dash provenance", () => {
  it("when health score and signals ready, Details and Analyze exist", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const text = collectAllText(test);
    expect(text).toContain("Details");
    expect(text).toContain("Analyze");
  });

  it("pressing Details opens provenance drawer with Health Score provenance", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const detailsButton = findPressableWithText(test, "Details");
    expect(detailsButton).not.toBeNull();
    act(() => {
      (detailsButton as renderer.ReactTestInstance).props.onPress();
    });
    const textAfter = collectAllText(test);
    expect(textAfter).toContain("Health Score provenance");
    expect(textAfter).toContain("Model Version");
  });

  it("pressing Analyze opens provenance drawer with Signals provenance", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashScreen />);
    });
    const analyzeButton = findPressableWithText(test, "Analyze");
    expect(analyzeButton).not.toBeNull();
    act(() => {
      (analyzeButton as renderer.ReactTestInstance).props.onPress();
    });
    const textAfter = collectAllText(test);
    expect(textAfter).toContain("Signals provenance");
    expect(textAfter).toContain("Model Version");
  });
});
