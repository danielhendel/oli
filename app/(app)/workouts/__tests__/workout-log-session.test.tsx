import React, { act } from "react";
import renderer from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
  }),
}));

jest.mock("@/lib/workouts/sessionEngine/commands", () => ({
  createSessionDraft: jest.fn().mockResolvedValue({ sessionId: "s1" }),
  startSession: jest.fn().mockResolvedValue(undefined),
  addExercise: jest.fn().mockResolvedValue({ slotId: "slot1" }),
  logStrengthSet: jest.fn().mockResolvedValue({ setId: "set1" }),
  completeSession: jest.fn().mockResolvedValue(undefined),
}));

let mockActiveSessionId: string | null = null;
jest.mock("@/lib/workouts/sessionEngine/activeSessionStorage", () => ({
  getActiveWorkoutSessionId: jest.fn(async () => mockActiveSessionId),
  setActiveWorkoutSessionId: jest.fn(async () => undefined),
  clearActiveWorkoutSessionId: jest.fn(async () => undefined),
}));

let mockReduced = {
  ownerUid: "u1",
  sessionId: "s1",
  status: "active",
  exercises: [],
  notes: [],
  eventCount: 1,
};

jest.mock("@/lib/workouts/sessionEngine/selectors", () => ({
  loadReducedSession: jest.fn().mockImplementation(async () => mockReduced),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const WorkoutLogScreen = require("../log").default;

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

describe("workouts/log session UI", () => {
  beforeEach(() => {
    allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
    mockActiveSessionId = null;
  });

  it("starts a session and renders active UI", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    const startBtn = test.root.findByProps({ accessibilityLabel: "Start workout" });
    expect(startBtn).toBeDefined();

    await act(async () => {
      startBtn.props.onPress();
    });

    const text = collectAllText(test);
    expect(text).toContain("Session in progress");
    expect(text).toContain("Session ID:");
  });

  it("resumes active session when stored", async () => {
    mockActiveSessionId = "s1";
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    const text = collectAllText(test);
    expect(text).toContain("Session in progress");
    expect(text).toContain("Session ID:");
  });

  it("adds an exercise and shows it", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(<WorkoutLogScreen />);
    });

    const startBtn = test.root.findByProps({ accessibilityLabel: "Start workout" });
    await act(async () => {
      startBtn.props.onPress();
    });

    // update reducer to include an exercise after add
    mockReduced = {
      ...mockReduced,
      exercises: [
        {
          slotId: "slot1",
          exerciseId: "bench_press",
          position: 0,
          removed: false,
          sets: [],
        },
      ],
      eventCount: 2,
    };

    const exInput = test.root.findByProps({ accessibilityLabel: "Exercise name" });
    await act(async () => {
      exInput.props.onChangeText("Bench Press");
    });

    const addBtn = test.root.findByProps({ accessibilityLabel: "Add exercise" });
    await act(async () => {
      addBtn.props.onPress();
    });

    const text = collectAllText(test);
    expect(text).toContain("bench_press");
  });
});
