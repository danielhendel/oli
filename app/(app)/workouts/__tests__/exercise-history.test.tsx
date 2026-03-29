import React from "react";
import renderer, { act } from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  RefreshControl: "RefreshControl",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("@/lib/data/useWeightSeries", () => ({
  useWeightSeries: jest.fn().mockReturnValue({
    status: "ready",
    data: { latest: null },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1" }, initializing: false }),
}));

const mockBack = jest.fn();
const mockUseLocalSearchParams = jest.fn().mockReturnValue({});
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock("@/lib/workouts/hooks/useExerciseHistory", () => ({
  useExerciseHistory: jest.fn(),
}));

jest.mock("@/lib/ui/ExerciseProgressChart", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { ExerciseProgressChart: () => React.createElement(View, { testID: "exercise-progress-chart" }) };
});

jest.mock("@/lib/ui/ScreenStates", () => ({
  LoadingState: ({ message }: { message?: string }) =>
    require("react").createElement("Text", null, message ?? "Loading…"),
  EmptyState: ({ title }: { title: string }) =>
    require("react").createElement("Text", null, title),
  ErrorState: ({ message }: { message: string }) =>
    require("react").createElement("Text", null, message),
}));

const useExerciseHistory = require("@/lib/workouts/hooks/useExerciseHistory")
  .useExerciseHistory as jest.Mock;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ExerciseHistoryScreen = require("../exercise-history").default;

describe("exercise-history screen", () => {
  let mounted: renderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
    mockUseLocalSearchParams.mockReturnValue({});
    useExerciseHistory.mockReturnValue({
      status: "partial",
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    const t = mounted;
    mounted = null;
    if (t != null) {
      act(() => {
        t.unmount();
      });
    }
  });

  it("shows no exercise selected when exerciseId is missing", () => {
    mockUseLocalSearchParams.mockReturnValue({});
    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: { summary: { lastPerformedAt: null, totalSessions: 0, bestE1RmKg: null, lastSummaryText: null }, sessions: [] },
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const emptyState = mounted!.root.findAllByType("Text").find((t) => {
      const c = t.props.children;
      return c === "No exercise selected";
    });
    expect(emptyState).toBeTruthy();
  });

  it("shows loading when exerciseId present and status is partial", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({ status: "partial", refetch: jest.fn() });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const loadingText = mounted!.root.findAllByType("Text").find(
      (t) => t.props.children === "Loading history…" || t.props.children === "Loading…",
    );
    expect(loadingText).toBeTruthy();
  });

  it("shows empty state when history has no sessions", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: {
          lastPerformedAt: null,
          totalSessions: 0,
          bestE1RmKg: null,
          lastSummaryText: null,
        },
        sessions: [],
      },
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const empty = mounted!.root.findAllByType("Text").find((t) => {
      const c = t.props.children;
      return c === "No history yet";
    });
    expect(empty).toBeTruthy();
  });

  it("shows error state when status is error", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({
      status: "error",
      error: "Load failed",
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const err = mounted!.root.findAllByType("Text").find((t) => t.props.children === "Load failed");
    expect(err).toBeTruthy();
  });

  it("shows summary and session when history is ready", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: {
          lastPerformedAt: "2026-03-01T10:00:00.000Z",
          totalSessions: 1,
          bestE1RmKg: 80,
          lastSummaryText: "2 × 10 @ 90 lb",
        },
        sessions: [
          {
            sessionId: "s1",
            startedAt: "2026-03-01T10:00:00.000Z",
            sets: [
              { ordinal: 1, reps: 10, loadKg: 40.82, rpe: null, occurredAt: "2026-03-01T10:02:00.000Z" },
              { ordinal: 2, reps: 8, loadKg: 61.23, rpe: 8, occurredAt: "2026-03-01T10:03:00.000Z" },
            ],
            volumeKg: 900,
            bestE1RmKg: 80,
          },
        ],
      },
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const chart = mounted!.root.findByProps({ testID: "exercise-progress-chart" });
    expect(chart).toBeTruthy();
    const texts = mounted!.root.findAllByType("Text").map((t) => (Array.isArray(t.props.children) ? t.props.children.join("") : t.props.children));
    expect(texts.some((s) => String(s).includes("1"))).toBe(true);
    expect(texts.some((s) => String(s).includes("Sessions"))).toBe(true);
  });

  it("shows progress chart when history has sessions and no chart when empty", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: { lastPerformedAt: null, totalSessions: 0, bestE1RmKg: null, lastSummaryText: null },
        sessions: [],
      },
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const chartWhenEmpty = mounted!.root.findAllByProps({ testID: "exercise-progress-chart" });
    expect(chartWhenEmpty).toHaveLength(0);

    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: { lastPerformedAt: "2026-03-01T10:00:00.000Z", totalSessions: 2, bestE1RmKg: 100, lastSummaryText: "3 × 8 @ 95 lb" },
        sessions: [
          { sessionId: "s1", startedAt: "2026-02-28T10:00:00.000Z", sets: [{ ordinal: 1, reps: 8, loadKg: 50, rpe: null, occurredAt: "2026-02-28T10:02:00.000Z" }], volumeKg: 400, bestE1RmKg: 63.33 },
          { sessionId: "s2", startedAt: "2026-03-01T10:00:00.000Z", sets: [{ ordinal: 1, reps: 8, loadKg: 55, rpe: null, occurredAt: "2026-03-01T10:02:00.000Z" }], volumeKg: 440, bestE1RmKg: 69.67 },
        ],
      },
      refetch: jest.fn(),
    });
    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const chartWithHistory = mounted!.root.findByProps({ testID: "exercise-progress-chart" });
    expect(chartWithHistory).toBeTruthy();
  });

  it("renders custom header with back button and exercise title", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: { lastPerformedAt: null, totalSessions: 0, bestE1RmKg: null, lastSummaryText: null },
        sessions: [],
      },
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const backBtn = mounted!.root.findByProps({ testID: "exercise-history-back" });
    expect(backBtn).toBeTruthy();
    const texts = mounted!.root.findAllByType("Text").map((t) => (Array.isArray(t.props.children) ? t.props.children.join("") : t.props.children));
    expect(texts.some((s) => String(s).includes("Bench Press") || String(s).includes("bench_press"))).toBe(true);
  });

  it("renders chart tabs Best Lift and Volume when history has sessions", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: { lastPerformedAt: "2026-03-01T10:00:00.000Z", totalSessions: 2, bestE1RmKg: 100, lastSummaryText: "3 × 8" },
        sessions: [
          { sessionId: "s1", startedAt: "2026-02-28T10:00:00.000Z", sets: [{ ordinal: 1, reps: 8, loadKg: 50, rpe: null, occurredAt: "2026-02-28T10:02:00.000Z" }], volumeKg: 400, bestE1RmKg: 63.33 },
          { sessionId: "s2", startedAt: "2026-03-01T10:00:00.000Z", sets: [{ ordinal: 1, reps: 8, loadKg: 55, rpe: null, occurredAt: "2026-03-01T10:02:00.000Z" }], volumeKg: 440, bestE1RmKg: 69.67 },
        ],
      },
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const texts = mounted!.root.findAllByType("Text").map((t) => (Array.isArray(t.props.children) ? t.props.children.join("") : t.props.children));
    expect(texts.some((s) => String(s) === "Best Lift")).toBe(true);
    expect(texts.some((s) => String(s) === "Volume")).toBe(true);
  });

  it("re-renders from loading to ready without hook-order violation", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({ status: "partial", refetch: jest.fn() });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    expect(mounted!.root.findAllByType("Text").some((t) => t.props.children === "Loading history…")).toBe(true);

    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: { lastPerformedAt: "2026-03-01T10:00:00.000Z", totalSessions: 1, bestE1RmKg: 80, lastSummaryText: "2 × 10" },
        sessions: [
          { sessionId: "s1", startedAt: "2026-03-01T10:00:00.000Z", sets: [{ ordinal: 1, reps: 10, loadKg: 40, rpe: null, occurredAt: "2026-03-01T10:02:00.000Z" }], volumeKg: 400, bestE1RmKg: 80 },
        ],
      },
      refetch: jest.fn(),
    });
    act(() => {
      mounted!.update(<ExerciseHistoryScreen />);
    });
    const chart = mounted!.root.findByProps({ testID: "exercise-progress-chart" });
    expect(chart).toBeTruthy();
  });

  it("renders strength metrics 2x2: Best e1RM, Best BW Ratio, Sessions, Best Actual Lift", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: { lastPerformedAt: "2026-03-01T10:00:00.000Z", totalSessions: 1, bestE1RmKg: 80, lastSummaryText: "2 × 10" },
        sessions: [
          { sessionId: "s1", startedAt: "2026-03-01T10:00:00.000Z", sets: [{ ordinal: 1, reps: 10, loadKg: 40, rpe: null, occurredAt: "2026-03-01T10:02:00.000Z" }], volumeKg: 400, bestE1RmKg: 80 },
        ],
      },
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const texts = mounted!.root.findAllByType("Text").map((t) => (Array.isArray(t.props.children) ? t.props.children.join("") : t.props.children));
    expect(texts.some((s) => String(s).includes("Strength metrics"))).toBe(true);
    expect(texts.some((s) => String(s).includes("Best e1RM"))).toBe(true);
    expect(texts.some((s) => String(s).includes("Best BW Ratio"))).toBe(true);
    expect(texts.some((s) => String(s).includes("Sessions"))).toBe(true);
    expect(texts.some((s) => String(s).includes("Best Actual Lift"))).toBe(true);
    expect(texts.some((s) => String(s).includes("88.2 lb × 10"))).toBe(true);
  });

  it("Best Actual Lift selects set with highest weight across sessions", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: { lastPerformedAt: "2026-03-02T10:00:00.000Z", totalSessions: 2, bestE1RmKg: 100, lastSummaryText: null },
        sessions: [
          { sessionId: "s1", startedAt: "2026-03-01T10:00:00.000Z", sets: [{ ordinal: 1, reps: 10, loadKg: 40, rpe: null, occurredAt: "2026-03-01T10:02:00.000Z" }], volumeKg: 400, bestE1RmKg: 52.33 },
          { sessionId: "s2", startedAt: "2026-03-02T10:00:00.000Z", sets: [{ ordinal: 1, reps: 5, loadKg: 50, rpe: null, occurredAt: "2026-03-02T10:02:00.000Z" }], volumeKg: 250, bestE1RmKg: 58.33 },
        ],
      },
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const texts = mounted!.root.findAllByType("Text").map((t) => (Array.isArray(t.props.children) ? t.props.children.join("") : t.props.children));
    expect(texts.some((s) => String(s).includes("110.2 lb × 5"))).toBe(true);
  });

  it("Best Actual Lift tie-breaks equal weight by higher reps", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: { lastPerformedAt: "2026-03-01T10:00:00.000Z", totalSessions: 1, bestE1RmKg: 80, lastSummaryText: null },
        sessions: [
          {
            sessionId: "s1",
            startedAt: "2026-03-01T10:00:00.000Z",
            sets: [
              { ordinal: 1, reps: 8, loadKg: 40, rpe: null, occurredAt: "2026-03-01T10:02:00.000Z" },
              { ordinal: 2, reps: 10, loadKg: 40, rpe: null, occurredAt: "2026-03-01T10:03:00.000Z" },
            ],
            volumeKg: 720,
            bestE1RmKg: 80,
          },
        ],
      },
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const texts = mounted!.root.findAllByType("Text").map((t) => (Array.isArray(t.props.children) ? t.props.children.join("") : t.props.children));
    expect(texts.some((s) => String(s).includes("88.2 lb × 10"))).toBe(true);
  });

  it("Best Actual Lift shows — when no sets have logged weight", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: { lastPerformedAt: "2026-03-01T10:00:00.000Z", totalSessions: 1, bestE1RmKg: null, lastSummaryText: null },
        sessions: [
          { sessionId: "s1", startedAt: "2026-03-01T10:00:00.000Z", sets: [{ ordinal: 1, reps: 10, loadKg: null, rpe: null, occurredAt: "2026-03-01T10:02:00.000Z" }], volumeKg: 0, bestE1RmKg: null },
        ],
      },
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const texts = mounted!.root.findAllByType("Text").map((t) => (Array.isArray(t.props.children) ? t.props.children.join("") : t.props.children));
    expect(texts.some((s) => String(s).includes("Best Actual Lift"))).toBe(true);
    expect(texts.some((s) => String(s) === "—")).toBe(true);
  });

  it("does not render last-summary text line in Strength metrics card", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: { lastPerformedAt: "2026-03-01T10:00:00.000Z", totalSessions: 1, bestE1RmKg: 80, lastSummaryText: "2 × 10 @ 90 lb" },
        sessions: [
          { sessionId: "s1", startedAt: "2026-03-01T10:00:00.000Z", sets: [{ ordinal: 1, reps: 10, loadKg: 40.82, rpe: null, occurredAt: "2026-03-01T10:02:00.000Z" }], volumeKg: 400, bestE1RmKg: 80 },
        ],
      },
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const texts = mounted!.root.findAllByType("Text").map((t) => (Array.isArray(t.props.children) ? t.props.children.join("") : t.props.children));
    expect(texts.some((s) => String(s).includes("2 × 10 @ 90 lb"))).toBe(false);
  });

  it("renders session table with header row (Set, Reps, Weight, RPE, e1RM, Vol)", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: { lastPerformedAt: "2026-03-01T10:00:00.000Z", totalSessions: 1, bestE1RmKg: 80, lastSummaryText: null },
        sessions: [
          {
            sessionId: "s1",
            startedAt: "2026-03-01T10:00:00.000Z",
            sets: [
              { ordinal: 1, reps: 10, loadKg: 43.09, rpe: 4, occurredAt: "2026-03-01T10:02:00.000Z" },
              { ordinal: 2, reps: 8, loadKg: 61.23, rpe: 8, occurredAt: "2026-03-01T10:03:00.000Z" },
            ],
            volumeKg: 900,
            bestE1RmKg: 80,
          },
        ],
      },
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const texts = mounted!.root.findAllByType("Text").map((t) => (Array.isArray(t.props.children) ? t.props.children.join("") : t.props.children));
    expect(texts.some((s) => String(s) === "Set")).toBe(true);
    expect(texts.some((s) => String(s) === "Reps")).toBe(true);
    expect(texts.some((s) => String(s) === "Weight")).toBe(true);
    expect(texts.some((s) => String(s) === "RPE")).toBe(true);
    expect(texts.some((s) => String(s) === "e1RM")).toBe(true);
    expect(texts.some((s) => String(s) === "Vol")).toBe(true);
  });

  it("renders per-set e1RM and volume in session table rows", () => {
    mockUseLocalSearchParams.mockReturnValue({ exerciseId: "bench_press" });
    useExerciseHistory.mockReturnValue({
      status: "ready",
      data: {
        summary: { lastPerformedAt: "2026-03-01T10:00:00.000Z", totalSessions: 1, bestE1RmKg: 80, lastSummaryText: null },
        sessions: [
          {
            sessionId: "s1",
            startedAt: "2026-03-01T10:00:00.000Z",
            sets: [
              { ordinal: 1, reps: 10, loadKg: 45.36, rpe: 5, occurredAt: "2026-03-01T10:02:00.000Z" },
            ],
            volumeKg: 453.6,
            bestE1RmKg: 60.48,
          },
        ],
      },
      refetch: jest.fn(),
    });

    act(() => {
      mounted = renderer.create(<ExerciseHistoryScreen />);
    });
    const texts = mounted!.root.findAllByType("Text").map((t) => (Array.isArray(t.props.children) ? t.props.children.join("") : t.props.children));
    expect(texts.some((s) => String(s) === "1")).toBe(true);
    expect(texts.some((s) => String(s) === "10")).toBe(true);
    expect(texts.some((s) => String(s) === "5")).toBe(true);
    expect(texts.some((s) => String(s) === "133")).toBe(true);
    expect(texts.some((s) => String(s) === "1000")).toBe(true);
  });
});
