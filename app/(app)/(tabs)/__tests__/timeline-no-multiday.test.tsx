// app/(app)/(tabs)/__tests__/timeline-no-multiday.test.tsx
// Phase 0 regression guard — the Timeline tab root must NOT issue the multi-day
// GET /users/me/timeline request (useTimeline) on tab open. That request was the
// source of the "Request timed out" failure this rewrite replaces.

import React from "react";
import renderer, { act } from "react-test-renderer";

const mockUseTimeline = jest.fn(() => {
  throw new Error("multi-day timeline must not be used by the Timeline tab root");
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@react-navigation/native", () => ({ useIsFocused: () => true }));

jest.mock("@/lib/data/useTimeline", () => ({ useTimeline: mockUseTimeline }));

jest.mock("@/lib/data/useEvents", () => ({
  useEvents: () => ({ status: "ready", data: { items: [], nextCursor: null }, refetch: jest.fn() }),
}));
jest.mock("@/lib/data/useRawEvents", () => ({
  useRawEvents: () => ({ status: "ready", data: { items: [], nextCursor: null }, refetch: jest.fn() }),
}));
jest.mock("@/lib/hooks/useSleepNight", () => ({
  useSleepNight: () => ({ view: undefined, loading: false, settled: true, error: null, refetch: jest.fn() }),
}));
jest.mock("@/lib/data/useDailyFacts", () => ({
  useDailyFacts: () => ({ status: "missing", refetch: jest.fn() }),
}));
jest.mock("@/lib/data/useInsights", () => ({
  useInsights: () => ({
    status: "ready",
    data: { day: "2026-06-10", count: 0, items: [] },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "test-user" }, initializing: false, getIdToken: jest.fn() }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TimelineIndexScreen = require("../timeline/index").default;

describe("Timeline tab root data sources", () => {
  it("does not call the multi-day useTimeline hook on tab open", () => {
    act(() => {
      renderer.create(<TimelineIndexScreen />);
    });
    expect(mockUseTimeline).not.toHaveBeenCalled();
  });
});
