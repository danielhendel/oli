// app/(app)/failures/__tests__/failures-screen-renders.test.tsx
// Phase 1 Lock #2 — Proves failures render when API returns failures.

import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Modal: "Modal",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/time/dayKey", () => ({
  getTodayDayKey: () => "2026-01-15",
}));

const MOCK_FAILURE_1 = {
  id: "f1",
  type: "normalization",
  code: "RAW_EVENT_INVALID",
  message: "RawEvent failed contract validation",
  day: "2026-01-15",
  createdAt: "2026-01-15T10:00:00.000Z",
};

const MOCK_FAILURE_2 = {
  id: "f2",
  type: "ingestion",
  code: "DUPLICATE_EVENT",
  message: "Event already exists",
  day: "2026-01-15",
  createdAt: "2026-01-15T09:00:00.000Z",
};

jest.mock("@/lib/data/useFailures", () => ({
  useFailures: () => ({
    status: "ready",
    data: { items: [MOCK_FAILURE_1, MOCK_FAILURE_2], nextCursor: null },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useFailuresRange", () => ({
  useFailuresRange: () => ({
    status: "ready",
    data: { items: [], nextCursor: null, truncated: false },
    refetch: jest.fn(),
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FailuresScreen = require("../index").default;

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

describe("FailuresScreen — renders failures", () => {
  it("renders failure messages when API returns failures", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<FailuresScreen />);
    });

    const text = collectAllText(test);
    expect(text).toContain("Failures");
    expect(text).toContain("RawEvent failed contract validation");
    expect(text).toContain("Event already exists");
    expect(text).toContain("RAW_EVENT_INVALID");
    expect(text).toContain("DUPLICATE_EVENT");
  });

  it("renders list with correct count (2 items)", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<FailuresScreen />);
    });

    const text = collectAllText(test);
    expect(text).toContain("RawEvent failed contract validation");
    expect(text).toContain("Event already exists");
    expect(text.split("RAW_EVENT_INVALID").length).toBe(2);
    expect(text.split("DUPLICATE_EVENT").length).toBe(2);
  });

  it("renders newest first (createdAt descending)", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<FailuresScreen />);
    });

    const text = collectAllText(test);
    const idx1 = text.indexOf("RawEvent failed contract validation");
    const idx2 = text.indexOf("Event already exists");
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeGreaterThanOrEqual(0);
    expect(idx1).toBeLessThan(idx2);
  });
});
