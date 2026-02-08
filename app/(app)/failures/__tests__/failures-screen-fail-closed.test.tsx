// app/(app)/failures/__tests__/failures-screen-fail-closed.test.tsx
// Phase 1 Lock #2 — Proves malformed failures payload renders error UI, no failures list.

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

jest.mock("@/lib/data/useFailures", () => ({
  useFailures: () => ({
    status: "error",
    error: "Invalid response shape",
    requestId: "req-456",
    reason: "contract",
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/data/useFailuresRange", () => ({
  useFailuresRange: () => ({
    status: "error",
    error: "Invalid response shape",
    requestId: "req-456",
    reason: "contract",
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

describe("FailuresScreen — fail-closed on contract error", () => {
  it("renders Data validation failed when API returns contract error", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<FailuresScreen />);
    });

    const text = collectAllText(test);
    expect(text).toContain("Data validation failed");
    expect(text).toContain("Try again");
  });

  it("does NOT render failure list items when contract error", () => {
    let test!: renderer.ReactTestRenderer;

    act(() => {
      test = renderer.create(<FailuresScreen />);
    });

    const text = collectAllText(test);
    expect(text).not.toContain("RAW_EVENT_INVALID");
    expect(text).not.toContain("RawEvent failed contract validation");
    expect(text).not.toContain("No failures recorded");
  });
});
