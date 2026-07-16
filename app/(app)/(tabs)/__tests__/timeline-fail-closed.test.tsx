// app/(app)/(tabs)/__tests__/timeline-fail-closed.test.tsx
// Phase 1 — Timeline tab root is a single-day log. The primary source failing renders
// an error state with retry (it must not blank the screen).

import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/lib/features/timeline/useTimelineDay", () => ({
  useTimelineDay: () => ({
    day: "2026-06-10",
    status: {
      status: "error",
      error: "Request timed out",
      requestId: "req-1",
      reason: "network",
    },
    refetchAll: jest.fn(),
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TimelineIndexScreen = require("../timeline/index").default;

function collectAllText(test: renderer.ReactTestRenderer): string {
  const nodes = test.root.findAllByType("Text" as never);
  const parts: string[] = [];
  for (const n of nodes) {
    for (const child of n.children) {
      if (typeof child === "string" || typeof child === "number") parts.push(String(child));
    }
  }
  return parts.join(" ");
}

describe("Timeline tab root fail state", () => {
  it("renders an error state with retry when the primary source errors", () => {
    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<TimelineIndexScreen />);
    });

    const text = collectAllText(test);
    expect(text).toContain("Request timed out");
    expect(text).toContain("Try again");
  });
});
