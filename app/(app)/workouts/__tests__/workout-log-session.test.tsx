import React from "react";
import renderer, { act } from "react-test-renderer";
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

const mockReduced = {
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

jest.mock("@/lib/workouts/memory/exerciseMemory", () => ({
  buildExerciseMemory: jest.fn(async () => ({})),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const commands = require("@/lib/workouts/sessionEngine/commands");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WorkoutLogScreen = require("../log").default;

function findByA11yLabel(
  root: renderer.ReactTestRenderer["root"],
  label: string,
): renderer.ReactTestInstance | null {
  const pressables = root.findAllByType("Pressable");
  return pressables.find((p) => p.props.accessibilityLabel === label) ?? null;
}

describe("workouts/log session UI", () => {
  let test: renderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
    mockActiveSessionId = null;
  });

  afterEach(() => {
    test?.unmount();
    test = null;
  });

  it("renders Start workout CTA when idle", () => {
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    const startBtn = findByA11yLabel(test!.root, "Start workout");
    expect(startBtn).not.toBeNull();
  });

  it("pressing Start workout calls createSessionDraft + startSession", () => {
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    const startBtn = findByA11yLabel(test!.root, "Start workout");
    expect(startBtn).not.toBeNull();
    act(() => {
      startBtn!.props.onPress();
    });
    expect(commands.createSessionDraft).toHaveBeenCalled();
  });
});
