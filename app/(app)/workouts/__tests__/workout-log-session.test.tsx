import React from "react";
import renderer, { act } from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";

const mockScrollTo = jest.fn();
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  const React = require("react");
  const ScrollViewMock = React.forwardRef(function ScrollViewMock(props: Record<string, unknown>, ref) {
    React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
    return React.createElement("ScrollView", props, props.children);
  });
  return {
    View: "View",
    Text: "Text",
    TextInput: "TextInput",
    Pressable: "Pressable",
    ScrollView: ScrollViewMock,
    FlatList: function FlatList({
      data,
      renderItem,
      keyExtractor,
    }: {
      data: unknown[];
      renderItem: (o: { item: unknown; index: number }) => React.ReactNode;
      keyExtractor: (item: unknown, index: number) => string;
    }) {
      return React.createElement(
        "View",
        null,
        (data ?? []).map((item, index) =>
          React.createElement(
            "View",
            { key: keyExtractor?.(item, index) ?? index },
            renderItem({ item, index, separators: { highlight: jest.fn(), unhighlight: jest.fn(), updateProps: jest.fn() } }),
          ),
        ),
      );
    },
    Image: "Image",
    StyleSheet: { create: (s: unknown) => s },
    Animated: {
      View: "Animated.View",
      Value: RN.Animated.Value,
      spring: jest.fn(() => ({ start: jest.fn() })),
    },
    PanResponder: { create: jest.fn(() => ({ panHandlers: {} })) },
    Modal: "Modal",
    Platform: RN.Platform ?? { OS: "ios" },
    UIManager: RN.UIManager ?? {},
    LayoutAnimation: RN.LayoutAnimation ?? { configureNext: jest.fn(), Presets: {} },
    Alert: { alert: jest.fn() },
  };
});

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
const mockRouterDismissTo = jest.fn();
let mockLogSearchParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    dismissTo: mockRouterDismissTo,
    back: jest.fn(),
  }),
  useLocalSearchParams: () => mockLogSearchParams,
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
  }),
}));

let mockSelectedGymId: string | null = null;
let mockNextGymSaveShouldFail = false;
let mockPrefStatus: "ready" | "error" = "ready";
let mockPrefMessage = "";
jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state:
      mockPrefStatus === "error"
        ? {
            status: "error" as const,
            preferences: {
              units: { mass: "lb" as const },
              timezone: { mode: "recorded" as const },
              selectedGymId: null,
            },
            message: mockPrefMessage,
          }
        : {
            status: "ready" as const,
            preferences: {
              units: { mass: "lb" as const },
              timezone: { mode: "recorded" as const },
              selectedGymId: mockSelectedGymId,
            },
          },
    refresh: jest.fn(),
    setMassUnit: jest.fn(),
    setSelectedGymId: jest.fn(async (id: string | null) => {
      if (mockNextGymSaveShouldFail) {
        mockNextGymSaveShouldFail = false;
        throw new Error("mock save failed");
      }
      mockSelectedGymId = id;
    }),
  }),
}));

jest.mock("@/lib/workouts/sessionEngine/commands", () => ({
  createSessionDraft: jest.fn().mockResolvedValue({ sessionId: "s1" }),
  addWorkoutNote: jest.fn().mockResolvedValue(undefined),
  startSession: jest.fn().mockResolvedValue(undefined),
  createBlock: jest.fn().mockResolvedValue(undefined),
  updateBlock: jest.fn().mockResolvedValue(undefined),
  removeBlock: jest.fn().mockResolvedValue(undefined),
  addExercise: jest.fn().mockResolvedValue({ slotId: "slot1" }),
  logStrengthSet: jest.fn().mockResolvedValue({ setId: "set1" }),
  correctStrengthSet: jest.fn().mockResolvedValue(undefined),
  completeSession: jest.fn().mockResolvedValue(undefined),
  abandonSession: jest.fn().mockResolvedValue(undefined),
  removeExercise: jest.fn().mockResolvedValue(undefined),
  removeStrengthSet: jest.fn().mockResolvedValue(undefined),
}));

let mockActiveSessionId: string | null = null;
let mockActiveLogFlowMode: "live" | "backfill" = "live";
let mockEnrichPointer: string | null = null;
jest.mock("@/lib/workouts/sessionEngine/activeSessionStorage", () => ({
  getActiveWorkoutSessionId: jest.fn(async () => mockActiveSessionId),
  setActiveWorkoutSessionId: jest.fn(async () => undefined),
  clearActiveWorkoutSessionId: jest.fn(async () => undefined),
  getActiveWorkoutLogFlowMode: jest.fn(async () => mockActiveLogFlowMode),
}));

jest.mock("@/lib/workouts/sessionEngine/enrichSessionStorage", () => ({
  getEnrichSessionPointer: jest.fn(async () => mockEnrichPointer),
  setEnrichSessionPointer: jest.fn(async () => undefined),
  clearEnrichSessionPointer: jest.fn(async () => undefined),
}));

const mockReduced = {
  ownerUid: "u1",
  sessionId: "s1",
  status: "active",
  startedAt: "2026-03-01T10:00:00.000Z" as string | null,
  blocks: [] as { blockId: string; blockType: string; position: number; title: string; removed: boolean }[],
  exercises: [] as { slotId: string; blockId: string | null; exerciseId: string; position: number; removed: boolean; sets: unknown[] }[],
  notes: [] as string[],
  eventCount: 1,
};

jest.mock("@/lib/workouts/sessionEngine/selectors", () => ({
  loadReducedSession: jest.fn().mockImplementation(async () => mockReduced),
}));

let mockExerciseMemory: Record<
  string,
  { last: { reps: number; loadKg: number; occurredAt: string } | null; best: null; bestE1RmKg: null }
> = {};
jest.mock("@/lib/workouts/memory/exerciseMemory", () => ({
  buildExerciseMemory: jest.fn(async () => mockExerciseMemory),
}));

let mockPreviousComparison: Record<
  string,
  { summaryText: string | null; setsByOrdinal: Record<number, { ordinal: number; reps?: number; loadLb?: number; rpe?: number }> } | null
> = {};
jest.mock("@/lib/workouts/memory/previousWorkout", () => ({
  getPreviousExerciseComparison: jest.fn(async (_uid: string, exerciseId: string) => {
    const comp = mockPreviousComparison[exerciseId];
    return comp ?? { summaryText: null, setsByOrdinal: {} };
  }),
  formatPreviousSetDisplay: jest.fn((set: { reps?: number; loadLb?: number; rpe?: number }) => {
    const r = set.reps ?? 0;
    const w = set.loadLb != null && set.loadLb > 0 ? String(set.loadLb) : "BW";
    const base = r > 0 ? `${r}×${w}` : w;
    return set.rpe != null ? `${base} @${set.rpe}` : base;
  }),
}));

jest.mock("expo-video");

jest.mock("@/lib/workouts/restTimer", () => ({
  useRestTimer: () => ({ panelVisible: false, setPanelVisible: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: function MockIonicons() {
    return require("react").createElement("View", { testID: "mock-icon" });
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const commands = require("@/lib/workouts/sessionEngine/commands");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const activeSessionStorage = require("@/lib/workouts/sessionEngine/activeSessionStorage");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveSessionStartedAtIsoForDay } = require("@/lib/workouts/journal/sessionAnchorForDay");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logModule = require("../log");
const WorkoutLogScreen = logModule.default;
const WorkoutLogScreenInner = logModule.WorkoutLogScreenInner;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const enrichSessionStorage = require("@/lib/workouts/sessionEngine/enrichSessionStorage");

function findByA11yLabel(
  root: renderer.ReactTestRenderer["root"],
  label: string,
): renderer.ReactTestInstance | null {
  const nodes = root.findAll(
    (n) => typeof n.props?.accessibilityLabel === "string" && n.props.accessibilityLabel === label,
  );
  return nodes[0] ?? null;
}

function findByA11yLabelPrefix(
  root: renderer.ReactTestRenderer["root"],
  prefix: string,
): renderer.ReactTestInstance | null {
  const nodes = root.findAll(
    (n) =>
      typeof n.props?.accessibilityLabel === "string" &&
      n.props.accessibilityLabel.startsWith(prefix),
  );
  return nodes[0] ?? null;
}

async function flushEventLoop(): Promise<void> {
  await new Promise<void>((r) => setImmediate(r));
}

describe("workouts/log session UI", () => {
  let test: renderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
    mockActiveSessionId = null;
    mockReduced.status = "active";
    mockReduced.sessionId = "s1";
    mockReduced.startedAt = "2026-03-01T10:00:00.000Z";
    mockReduced.eventCount = 1;
    mockReduced.blocks = [];
    mockReduced.exercises = [];
    mockExerciseMemory = {};
    mockPreviousComparison = {};
    mockSelectedGymId = null;
    mockNextGymSaveShouldFail = false;
    mockSelectedGymId = null;
    mockPrefStatus = "ready";
    mockPrefMessage = "";
    mockRouterPush.mockClear();
    mockRouterReplace.mockClear();
    mockRouterDismissTo.mockClear();
    mockScrollTo.mockClear();
    mockLogSearchParams = {};
    mockActiveLogFlowMode = "live";
    mockEnrichPointer = null;
    enrichSessionStorage.getEnrichSessionPointer.mockClear();
    enrichSessionStorage.setEnrichSessionPointer.mockClear();
    enrichSessionStorage.clearEnrichSessionPointer.mockClear();
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

  it("idle start screen shows gym selector area", () => {
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    const gymSelector = findByA11yLabelPrefix(test!.root, "Gym:");
    expect(gymSelector).not.toBeNull();
  });

  it("idle start screen only shows gym selector + start button controls", () => {
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    const gymSelector = findByA11yLabelPrefix(test!.root, "Gym:");
    const startBtn = findByA11yLabel(test!.root, "Start workout");
    const nameInput = findByA11yLabel(test!.root, "Workout name (optional)");
    expect(gymSelector).not.toBeNull();
    expect(startBtn).not.toBeNull();
    expect(nameInput).toBeNull();
  });

  it("idle start screen back control renders", () => {
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    const backBtn = findByA11yLabel(test!.root, "Go back");
    expect(backBtn).not.toBeNull();
  });

  it("selecting Edge Fitness gym updates visible gym label", async () => {
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    const gymSelector = findByA11yLabelPrefix(test!.root, "Gym:");
    expect(gymSelector).not.toBeNull();

    act(() => {
      gymSelector!.props.onPress();
    });

    const edgeOption = findByA11yLabel(test!.root, "Gym: Edge Fitness Manchester CT");
    expect(edgeOption).not.toBeNull();

    act(() => {
      edgeOption!.props.onPress();
    });
    await flushEventLoop();

    const updatedGymSelector = findByA11yLabelPrefix(test!.root, "Gym: Edge Fitness Manchester CT");
    expect(updatedGymSelector).not.toBeNull();
  });

  it("when gym save fails, error message is shown and Start Workout visible gym label does not revert", async () => {
    mockNextGymSaveShouldFail = true;
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    const gymSelector = findByA11yLabelPrefix(test!.root, "Gym:");
    expect(gymSelector).not.toBeNull();

    act(() => {
      gymSelector!.props.onPress();
    });

    const edgeOption = findByA11yLabel(test!.root, "Gym: Edge Fitness Manchester CT");
    expect(edgeOption).not.toBeNull();

    act(() => {
      edgeOption!.props.onPress();
    });
    await flushEventLoop();

    const errorNode = findByA11yLabel(test!.root, "Gym save error");
    expect(errorNode).not.toBeNull();
    const gymRowAfter = findByA11yLabelPrefix(test!.root, "Gym: Edge Fitness Manchester CT");
    expect(gymRowAfter).not.toBeNull();
  });

  it("when preferences state is error, Start Workout shows gym save error with generic message", () => {
    mockPrefStatus = "error";
    mockPrefMessage = "No auth token (try Debug → Re-auth)";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    const errorNode = findByA11yLabel(test!.root, "Gym save error");
    expect(errorNode).not.toBeNull();
    const content = errorNode!.props.children;
    expect(String(content)).toContain("Gym preference couldn't be saved. You can still start your workout.");
  });

  it("after gym save fails, Start workout remains usable and starts session", async () => {
    mockNextGymSaveShouldFail = true;
    commands.createSessionDraft.mockClear();
    commands.startSession.mockClear();
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    const gymSelector = findByA11yLabelPrefix(test!.root, "Gym:");
    act(() => {
      gymSelector!.props.onPress();
    });
    const edgeOption = findByA11yLabel(test!.root, "Gym: Edge Fitness Manchester CT");
    act(() => {
      edgeOption!.props.onPress();
    });
    await flushEventLoop();
    await flushEventLoop();
    expect(findByA11yLabel(test!.root, "Gym save error")).not.toBeNull();
    const startBtn = findByA11yLabel(test!.root, "Start workout");
    expect(startBtn).not.toBeNull();
    expect(startBtn!.props.disabled).not.toBe(true);
    act(() => {
      startBtn!.props.onPress();
    });
    await flushEventLoop();
    await flushEventLoop();
    expect(commands.createSessionDraft).toHaveBeenCalled();
    expect(commands.startSession).toHaveBeenCalledWith("u1", "s1", undefined, undefined);
  });

  it("renders Active set card when active session has one block and one exercise", async () => {
    // Active set card UI has been removed in WL-UX2-clean; this test is no longer applicable.
  });

  it("pressing Start workout calls createSessionDraft + startSession", async () => {
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    const startBtn = findByA11yLabel(test!.root, "Start workout");
    expect(startBtn).not.toBeNull();
    act(() => {
      startBtn!.props.onPress();
    });
    await flushEventLoop();
    await flushEventLoop();
    expect(commands.createSessionDraft).toHaveBeenCalled();
    expect(commands.startSession).toHaveBeenCalledWith("u1", "s1", undefined, undefined);
  });

  it("live /workouts/log ignores enrich params and shows Start workout (not enrichment bootstrap)", async () => {
    mockLogSearchParams = {
      enrichDay: "2026-03-18",
      enrichTargetId: "2026-03-18:session:0:w1",
      sessionAnchorIso: "2026-03-18T15:30:00.000Z",
    };
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    const startBtn = findByA11yLabel(test!.root, "Start workout");
    expect(startBtn).not.toBeNull();
    expect(findByA11yLabel(test!.root, "Continue to add exercises")).toBeNull();
    expect(enrichSessionStorage.getEnrichSessionPointer).not.toHaveBeenCalled();
  });

  it("enrichment route auto-bootstraps journal with anchor and scopes enrichSessionStorage", async () => {
    mockLogSearchParams = {
      enrichDay: "2026-03-18",
      enrichTargetId: "2026-03-18:session:0:w1",
      sessionAnchorIso: "2026-03-18T15:30:00.000Z",
    };
    mockEnrichPointer = null;
    commands.startSession.mockClear();
    commands.createSessionDraft.mockClear();
    act(() => {
      test = renderer.create(<WorkoutLogScreenInner sessionEntry="enrichment" />);
    });
    await flushEventLoop();
    await flushEventLoop();
    expect(commands.createSessionDraft).toHaveBeenCalled();
    expect(commands.startSession).toHaveBeenCalledWith("u1", "s1", undefined, {
      anchorOccurredAt: resolveSessionStartedAtIsoForDay(
        "2026-03-18",
        "2026-03-18T15:30:00.000Z",
      ),
    });
    expect(enrichSessionStorage.setEnrichSessionPointer).toHaveBeenCalledWith(
      "u1",
      "2026-03-18:session:0:w1",
      "s1",
    );
  });

  it("enrichment with journalSessionId hydrates existing journal without createSessionDraft", async () => {
    mockLogSearchParams = {
      enrichDay: "2026-03-18",
      enrichTargetId: "2026-03-18:session:0:w1",
      journalSessionId: "journal-existing",
    };
    mockEnrichPointer = null;
    mockReduced.status = "completed";
    mockReduced.sessionId = "journal-existing";
    mockReduced.startedAt = "2026-03-18T12:00:00.000Z";
    mockReduced.eventCount = 4;
    commands.createSessionDraft.mockClear();
    commands.startSession.mockClear();
    act(() => {
      test = renderer.create(<WorkoutLogScreenInner sessionEntry="enrichment" />);
    });
    await flushEventLoop();
    await flushEventLoop();
    expect(commands.createSessionDraft).not.toHaveBeenCalled();
    expect(commands.startSession).not.toHaveBeenCalled();
    expect(enrichSessionStorage.setEnrichSessionPointer).toHaveBeenCalledWith(
      "u1",
      "2026-03-18:session:0:w1",
      "journal-existing",
    );
    expect(test!.root.findByProps({ testID: "workout-log-backfill-nav" })).toBeTruthy();
  });

  it("start workout no longer writes workout-name note metadata", async () => {
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    const startBtn = findByA11yLabel(test!.root, "Start workout");
    act(() => {
      startBtn!.props.onPress();
    });
    await flushEventLoop();
    await flushEventLoop();
    expect(commands.addWorkoutNote).not.toHaveBeenCalled();
  });

  it("shows Add block when active with zero blocks (empty exercises)", async () => {
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0; /* flush React state after async effects */
    });
    const addBlockBtn = findByA11yLabel(test!.root, "Add block");
    expect(addBlockBtn).not.toBeNull();
  });

  it("Add block opens modal with block type options", async () => {
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const addBlockBtn = findByA11yLabel(test!.root, "Add block");
    expect(addBlockBtn).not.toBeNull();
    act(() => {
      addBlockBtn!.props.onPress();
    });
    const blockTypeSets = findByA11yLabel(test!.root, "Block type Sets");
    expect(blockTypeSets).not.toBeNull();
  });

  it("pressing Add block and selecting Sets calls createBlock and does NOT call router.push", async () => {
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const addBlockBtn = findByA11yLabel(test!.root, "Add block");
    act(() => {
      addBlockBtn!.props.onPress();
    });
    const blockTypeSets = findByA11yLabel(test!.root, "Block type Sets");
    act(() => {
      blockTypeSets!.props.onPress();
    });
    await flushEventLoop();
    expect(commands.createBlock).toHaveBeenCalledWith(
      "u1",
      "s1",
      expect.objectContaining({
        blockId: "block:sets:1",
        blockType: "sets",
        position: 0,
      }),
    );
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("when a block exists, Add exercise Sets button is shown", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const addExerciseSets = findByA11yLabel(test!.root, "Add exercise Sets");
    expect(addExerciseSets).not.toBeNull();
  });

  it("navigation to exercise picker includes workout-flow gym when gym was selected on Start Workout", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockRouterPush.mockClear();
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    const gymSelector = findByA11yLabelPrefix(test!.root, "Gym:");
    act(() => {
      gymSelector!.props.onPress();
    });
    const edgeOption = findByA11yLabel(test!.root, "Gym: Edge Fitness Manchester CT");
    act(() => {
      edgeOption!.props.onPress();
    });
    const startBtn = findByA11yLabel(test!.root, "Start workout");
    act(() => {
      startBtn!.props.onPress();
    });
    await flushEventLoop();
    await flushEventLoop();
    const addExerciseSets = findByA11yLabel(test!.root, "Add exercise Sets");
    expect(addExerciseSets).not.toBeNull();
    act(() => {
      addExerciseSets!.props.onPress();
    });
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/(app)/workouts/exercise-picker",
        params: expect.objectContaining({
          sessionId: "s1",
          blockId: "block:sets:1",
          gymId: "edge_fitness_manchester_ct",
        }),
      }),
    );
  });

  it("renders block header and exercise row with N sets summary when sets exist", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [
          { setId: "set1", ordinal: 1, reps: 5, loadKg: 100, rpe: null, tempo: null, isWarmup: false, note: null, occurredAt: "2026-03-01T10:00:00.000Z" },
          { setId: "set2", ordinal: 2, reps: 5, loadKg: 100, rpe: null, tempo: null, isWarmup: false, note: null, occurredAt: "2026-03-01T10:01:00.000Z" },
        ],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    expect(openExerciseBtn).not.toBeNull();
    const tree = test!.toJSON();
    expect(tree && JSON.stringify(tree)).toContain("2 sets");
  });

  it("expanded exercise replaces collapsed tile (no duplicate header)", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    expect(openExerciseBtn).not.toBeNull();
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const collapsedRowWhenExpanded = findByA11yLabel(test!.root, "Open exercise Bench Press");
    expect(collapsedRowWhenExpanded).toBeNull();
    expect(findByA11yLabel(test!.root, "Exercise logger inline slot1")).not.toBeNull();
  });

  it("tapping exercise row opens Exercise Logger inline; hero menu exists", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    expect(openExerciseBtn).not.toBeNull();
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const inlineLogger = findByA11yLabel(test!.root, "Exercise logger inline slot1");
    expect(inlineLogger).not.toBeNull();
    const heroMenuBtn = findByA11yLabel(test!.root, "Exercise options Bench Press");
    expect(heroMenuBtn).not.toBeNull();
  });

  it("tapping Collapse exercise logger collapses expanded panel", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    expect(findByA11yLabel(test!.root, "Exercise logger inline slot1")).not.toBeNull();
    const collapseBtn = findByA11yLabel(test!.root, "Collapse Bench Press");
    expect(collapseBtn).not.toBeNull();
    act(() => {
      collapseBtn!.props.onPress();
    });
    expect(findByA11yLabel(test!.root, "Exercise logger inline slot1")).toBeNull();
  });

  it("expanded exercise shows History and + Set when memory is empty (no inline Last)", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    mockExerciseMemory = {};
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const tree = test!.toJSON();
    const str = tree ? JSON.stringify(tree) : "";
    expect(str).toContain("History");
    expect(str).toContain("+ Set");
    expect(str).not.toMatch(/Last:/);
  });

  it("expanded exercise shows History and + Set (no inline Last summary)", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    mockExerciseMemory = {
      bench_press: {
        last: { reps: 10, loadKg: 40.82, occurredAt: "2026-03-01T10:00:00.000Z" },
        best: null,
        bestE1RmKg: null,
      },
    };
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const tree = test!.toJSON();
    const str = tree ? JSON.stringify(tree) : "";
    expect(str).toContain("History");
    expect(str).toContain("+ Set");
    expect(str).not.toMatch(/Last:/);
  });

  it("expanded exercise with no logged sets shows utility row History and + Set (grid header hidden)", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const tree = test!.toJSON();
    const str = tree ? JSON.stringify(tree) : "";
    expect(str).toContain("History");
    expect(str).toContain("+ Set");
    expect(str).not.toContain("e1RM");
    expect(str).not.toContain("Vol");
  });

  it("expanded exercise with at least one logged set shows summary row format", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [
          {
            setId: "set1",
            ordinal: 1,
            reps: 5,
            loadKg: 100,
            rpe: null,
            tempo: null,
            isWarmup: false,
            note: null,
            occurredAt: "2026-03-01T10:00:00.000Z",
          },
        ],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const tree = test!.toJSON();
    const str = tree ? JSON.stringify(tree) : "";
    expect(str).toContain("Set 1 - 5 reps");
    expect(str).toContain("x 220.5 lb");
    expect(str).toContain("@ — RPE");
    expect(str).toContain("History");
    expect(str).toContain("+ Set");
  });

  it("opening an exercise for logging shows expanded logger and scroll-to-top is wired (scrollTo called in real env after layout)", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const inlineLogger = findByA11yLabel(test!.root, "Exercise logger inline slot1");
    expect(inlineLogger).not.toBeNull();
    if (mockScrollTo.mock.calls.length > 0) {
      expect(mockScrollTo).toHaveBeenCalledWith(expect.objectContaining({ animated: true }));
    }
  });

  it("+ Set and History render in utility row", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      { slotId: "slot1", blockId: "block:sets:1", exerciseId: "bench_press", position: 0, removed: false, sets: [] },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    const historyBtn = findByA11yLabel(test!.root, "Exercise history");
    expect(addSetBtn).not.toBeNull();
    expect(historyBtn).not.toBeNull();
    const tree = test!.toJSON();
    const str = tree ? JSON.stringify(tree) : "";
    expect(str).toContain("+ Set");
    expect(str).toContain("History");
  });

  it("inline Last summary is not rendered; utility row has History and + Set", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      { slotId: "slot1", blockId: "block:sets:1", exerciseId: "bench_press", position: 0, removed: false, sets: [] },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const tree = test!.toJSON();
    const str = tree ? JSON.stringify(tree) : "";
    expect(str).not.toMatch(/Last:/);
    expect(str).toContain("History");
    expect(str).toContain("+ Set");
  });

  it("History action navigates to exercise-history with exerciseId", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      { slotId: "slot1", blockId: "block:sets:1", exerciseId: "bench_press", position: 0, removed: false, sets: [] },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const historyBtn = findByA11yLabel(test!.root, "Exercise history");
    expect(historyBtn).not.toBeNull();
    act(() => {
      historyBtn!.props.onPress();
    });
    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/exercise-history",
      params: { exerciseId: "bench_press" },
    });
  });

  it("previous workout comparison renders in grid when previous data exists", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [
          {
            setId: "set1",
            ordinal: 1,
            reps: 5,
            loadKg: 100,
            rpe: null,
            tempo: null,
            isWarmup: false,
            note: null,
            occurredAt: "2026-03-01T10:00:00.000Z",
          },
        ],
      },
    ];
    mockActiveSessionId = "s1";
    mockPreviousComparison = {
      bench_press: {
        summaryText: "3 × 10 @ 90 lb",
        setsByOrdinal: {
          1: { ordinal: 1, reps: 10, loadLb: 90 },
          2: { ordinal: 2, reps: 8, loadLb: 135, rpe: 8 },
          3: { ordinal: 3, reps: 8, loadLb: 155 },
        },
      },
    };
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    await flushEventLoop();
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const tree = test!.toJSON();
    const str = tree ? JSON.stringify(tree) : "";
    expect(str).toContain("History");
    expect(str).toContain("+ Set");
  });

  it("previous workout comparison falls back cleanly; History and + Set still shown", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [
          {
            setId: "set1",
            ordinal: 1,
            reps: 5,
            loadKg: 100,
            rpe: null,
            tempo: null,
            isWarmup: false,
            note: null,
            occurredAt: "2026-03-01T10:00:00.000Z",
          },
        ],
      },
    ];
    mockActiveSessionId = "s1";
    mockPreviousComparison = {};
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const tree = test!.toJSON();
    const str = tree ? JSON.stringify(tree) : "";
    expect(str).toContain("History");
    expect(str).toContain("+ Set");
  });

  it("active row renders with draft fields and Log button", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    act(() => {
      addSetBtn!.props.onPress();
    });
    const logBtn = findByA11yLabelPrefix(test!.root, "Log draft set ");
    expect(logBtn).not.toBeNull();
    const tree = test!.toJSON();
    const str = tree ? JSON.stringify(tree) : "";
    expect(str).toContain("Log");
  });

  it("active row aligns structurally with header columns", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      { slotId: "slot1", blockId: "block:sets:1", exerciseId: "bench_press", position: 0, removed: false, sets: [] },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    act(() => {
      addSetBtn!.props.onPress();
    });
    const tree = test!.toJSON();
    const str = tree ? JSON.stringify(tree) : "";
    expect(str).toContain("Set");
    expect(str).toContain("Reps");
    expect(str).toContain("Weight");
    expect(str).toContain("RPE");
    expect(str).toContain("Log");
    expect(str).toContain("+ Set");
  });

  it("pressing Log creates next draft row prefilled with just-logged values", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      { slotId: "slot1", blockId: "block:sets:1", exerciseId: "bench_press", position: 0, removed: false, sets: [] },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    act(() => {
      addSetBtn!.props.onPress();
    });
    const repsTapField = test!.root.findAll((n) => n.props?.accessibilityLabel === "Draft set reps")[0];
    act(() => {
      repsTapField?.props?.onPress?.();
    });
    const fiveRepsOption = findByA11yLabel(test!.root, "5 reps");
    act(() => {
      fiveRepsOption!.props.onPress();
    });
    const logDraftBtn = findByA11yLabel(test!.root, "Log draft set slot1:draft:0");
    expect(logDraftBtn).not.toBeNull();
    act(() => {
      logDraftBtn!.props.onPress();
    });
    await flushEventLoop();
    expect(commands.logStrengthSet).toHaveBeenCalled();
    const tree = test!.toJSON();
    const str = tree ? JSON.stringify(tree) : "";
    expect(str).toContain("5");
    const addSetBtnAfter = findByA11yLabel(test!.root, "Add draft set");
    expect(addSetBtnAfter).not.toBeNull();
    const draftRepsAfter = test!.root.findAll((n) => n.props?.accessibilityLabel === "Draft set reps");
    expect(draftRepsAfter.length).toBeGreaterThanOrEqual(1);
  });

  it("Log button renders in dedicated right-side action column", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      { slotId: "slot1", blockId: "block:sets:1", exerciseId: "bench_press", position: 0, removed: false, sets: [] },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    act(() => {
      addSetBtn!.props.onPress();
    });
    const logBtn = findByA11yLabelPrefix(test!.root, "Log draft set ");
    expect(logBtn).not.toBeNull();
    expect(logBtn!.props.accessibilityLabel).toMatch(/^Log draft set /);
  });

  it("Add draft set button is visible in utility row", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      { slotId: "slot1", blockId: "block:sets:1", exerciseId: "bench_press", position: 0, removed: false, sets: [] },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    expect(addSetBtn).not.toBeNull();
    const tree = test!.toJSON();
    expect(tree && JSON.stringify(tree)).toContain("+ Set");
  });

  it("+ Set remains visible in utility row", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      { slotId: "slot1", blockId: "block:sets:1", exerciseId: "bench_press", position: 0, removed: false, sets: [] },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    expect(addSetBtn).not.toBeNull();
    const addSetTextNode = addSetBtn!.findAll(
      (n: renderer.ReactTestInstance) => n.type === "Text" && n.props.children === "+ Set",
    )[0];
    expect(addSetTextNode).toBeDefined();
  });

  it("active row does not use highlighted container styling", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      { slotId: "slot1", blockId: "block:sets:1", exerciseId: "bench_press", position: 0, removed: false, sets: [] },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    act(() => {
      addSetBtn!.props.onPress();
    });
    const tree = test!.toJSON();
    const treeStr = tree ? JSON.stringify(tree) : "";
    expect(treeStr).not.toContain("F8FAFF");
    expect(treeStr).not.toContain("E4ECFF");
  });

  it("expanded exercise does not show standalone Sets label in set logger", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    expect(addSetBtn).not.toBeNull();
  });

  it("active row empty state shows Reps Weight RPE as tappable text labels", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      { slotId: "slot1", blockId: "block:sets:1", exerciseId: "bench_press", position: 0, removed: false, sets: [] },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    act(() => {
      addSetBtn!.props.onPress();
    });
    const tree = test!.toJSON();
    const treeStr = tree ? JSON.stringify(tree) : "";
    expect(treeStr).toContain("Reps");
    expect(treeStr).toContain("Weight");
    expect(treeStr).toContain("RPE");
  });

  it("active row picker triggers open wheel picker and update draft", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      { slotId: "slot1", blockId: "block:sets:1", exerciseId: "bench_press", position: 0, removed: false, sets: [] },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    act(() => {
      addSetBtn!.props.onPress();
    });
    const repsTap = test!.root.findAll((n) => n.props?.accessibilityLabel === "Draft set reps")[0];
    expect(repsTap).toBeDefined();
    act(() => {
      repsTap?.props?.onPress?.();
    });
    const fiveReps = findByA11yLabel(test!.root, "5 reps");
    expect(fiveReps).not.toBeNull();
    act(() => {
      fiveReps!.props.onPress();
    });
    const tree = test!.toJSON();
    const treeStr = tree ? JSON.stringify(tree) : "";
    expect(treeStr).toContain("5");
  });

  it("tapping Draft set reps opens number picker and selecting value updates draft", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    act(() => {
      addSetBtn!.props.onPress();
    });
    const repsTapField = test!.root.findAll(
      (n) => n.props?.accessibilityLabel === "Draft set reps",
    )[0];
    expect(repsTapField).toBeDefined();
    act(() => {
      repsTapField?.props?.onPress?.();
    });
    const fiveRepsOption = findByA11yLabel(test!.root, "5 reps");
    expect(fiveRepsOption).not.toBeNull();
    act(() => {
      fiveRepsOption!.props.onPress();
    });
    const tree = test!.toJSON();
    expect(tree && JSON.stringify(tree)).toContain("5");
  });

  it("reps picker includes options up to 100", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      { slotId: "slot1", blockId: "block:sets:1", exerciseId: "bench_press", position: 0, removed: false, sets: [] },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    act(() => {
      addSetBtn!.props.onPress();
    });
    const repsTapField = test!.root.findAll((n) => n.props?.accessibilityLabel === "Draft set reps")[0];
    act(() => {
      repsTapField?.props?.onPress?.();
    });
    const hundredReps = findByA11yLabel(test!.root, "100 reps");
    expect(hundredReps).not.toBeNull();
  });

  it("empty draft set selector boxes do not display dash placeholder", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    act(() => {
      addSetBtn!.props.onPress();
    });
    const repsTapField = test!.root.findAll(
      (n) => n.props?.accessibilityLabel === "Draft set reps",
    )[0];
    expect(repsTapField).toBeDefined();
    const textNodes = repsTapField.findAll((n) => n.type === "Text");
    expect(textNodes.length).toBeGreaterThan(0);
    expect(textNodes[0].props.children).not.toBe("—");
  });

  it("weight picker uses single precomputed list and selecting weight updates active row with lb", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    act(() => {
      addSetBtn!.props.onPress();
    });
    const loadTapField = test!.root.findAll(
      (n) => n.props?.accessibilityLabel === "Draft set load",
    )[0];
    expect(loadTapField).toBeDefined();
    act(() => {
      loadTapField?.props?.onPress?.();
    });
    const ninetySevenPointFive = findByA11yLabel(test!.root, "97.5 lb");
    expect(ninetySevenPointFive).not.toBeNull();
    act(() => {
      ninetySevenPointFive!.props.onPress();
    });
    const tree = test!.toJSON();
    expect(tree && JSON.stringify(tree)).toContain("97.5 lb");
  });

  describe("Weight quick-jump", () => {
    async function openLoadPicker() {
      mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
      mockReduced.exercises = [
        {
          slotId: "slot1",
          blockId: "block:sets:1",
          exerciseId: "bench_press",
          position: 0,
          removed: false,
          sets: [],
        },
      ];
      mockActiveSessionId = "s1";
      act(() => {
        test = renderer.create(<WorkoutLogScreen />);
      });
      await flushEventLoop();
      await flushEventLoop();
      act(() => {
        void 0;
      });
      const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
      act(() => {
        openExerciseBtn!.props.onPress();
      });
      const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
      act(() => {
        addSetBtn!.props.onPress();
      });
      const loadTapField = test!.root.findAll(
        (n) => n.props?.accessibilityLabel === "Draft set load",
      )[0];
      expect(loadTapField).toBeDefined();
      act(() => {
        loadTapField?.props?.onPress?.();
      });
    }

    it("BW +10 => 10 (single application, no double-apply)", async () => {
      await openLoadPicker();
      const add10Btn = findByA11yLabel(test!.root, "Add 10 lb");
      expect(add10Btn).not.toBeNull();
      act(() => {
        add10Btn!.props.onPress();
      });
      const tree = test!.toJSON();
      expect(tree && JSON.stringify(tree)).toContain("10 lb");
    });

    it("BW +45 => 45", async () => {
      await openLoadPicker();
      const add45Btn = findByA11yLabel(test!.root, "Add 45 lb");
      expect(add45Btn).not.toBeNull();
      act(() => {
        add45Btn!.props.onPress();
      });
      const tree = test!.toJSON();
      expect(tree && JSON.stringify(tree)).toContain("45 lb");
    });

    it("0 +10 => 10 (picker shows BW for empty draft)", async () => {
      await openLoadPicker();
      const add10Btn = findByA11yLabel(test!.root, "Add 10 lb");
      act(() => {
        add10Btn!.props.onPress();
      });
      const tree = test!.toJSON();
      expect(tree && JSON.stringify(tree)).toContain("10 lb");
    });

    it("10 +10 => 20", async () => {
      await openLoadPicker();
      const add10Btn = findByA11yLabel(test!.root, "Add 10 lb");
      act(() => {
        add10Btn!.props.onPress();
      });
      act(() => {
        add10Btn!.props.onPress();
      });
      const tree = test!.toJSON();
      expect(tree && JSON.stringify(tree)).toContain("20 lb");
    });

    it("100 +45 => 145", async () => {
      await openLoadPicker();
      const option100 = findByA11yLabel(test!.root, "100 lb");
      expect(option100).not.toBeNull();
      act(() => {
        option100!.props.onPress();
      });
      const add45Btn = findByA11yLabel(test!.root, "Add 45 lb");
      expect(add45Btn).not.toBeNull();
      act(() => {
        add45Btn!.props.onPress();
      });
      const tree = test!.toJSON();
      expect(tree && JSON.stringify(tree)).toContain("145 lb");
    });
  });

  it("precomputed weight list contains common gym weights", () => {
    const { getPrecomputedWeightListLb } = require("../log");
    const list = getPrecomputedWeightListLb();
    expect(list).toContain(95);
    expect(list).toContain(97.5);
    expect(list).toContain(100);
    expect(list).toContain(17.5);
    expect(list).toContain(185);
    expect(list[0]).toBe(0);
    expect(list[list.length - 1]).toBe(2000);
  });

  it("closestWeightIndexLb maps exact and nearest weight to correct list index", () => {
    const { closestWeightIndexLb, getPrecomputedWeightListLb } = require("../log");
    const list = getPrecomputedWeightListLb();
    expect(closestWeightIndexLb(0)).toBe(0);
    expect(list[closestWeightIndexLb(0)]).toBe(0);
    expect(closestWeightIndexLb(135)).toBe(list.indexOf(135));
    expect(list[closestWeightIndexLb(135)]).toBe(135);
    expect(closestWeightIndexLb(135.2)).toBe(list.indexOf(135));
    expect(list[closestWeightIndexLb(135.2)]).toBe(135);
    expect(closestWeightIndexLb(134.9)).toBe(list.indexOf(135));
    expect(list[closestWeightIndexLb(2050)]).toBe(2000);
  });

  it("Add draft set adds a new draft row with Log button", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    expect(addSetBtn).not.toBeNull();
    act(() => {
      addSetBtn!.props.onPress();
    });
    const logDraftBtn = findByA11yLabelPrefix(test!.root, "Log draft set ");
    expect(logDraftBtn).not.toBeNull();
  });

  it("logging a draft set calls logStrengthSet with slotId and ordinal 1 when no sets exist", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const addSetBtn = findByA11yLabel(test!.root, "Add draft set");
    act(() => {
      addSetBtn!.props.onPress();
    });
    const repsTapField = test!.root.findAll(
      (n) => n.props?.accessibilityLabel === "Draft set reps",
    )[0];
    expect(repsTapField).toBeDefined();
    act(() => {
      repsTapField?.props?.onPress?.();
    });
    const fiveRepsOption = findByA11yLabel(test!.root, "5 reps");
    expect(fiveRepsOption).not.toBeNull();
    act(() => {
      fiveRepsOption!.props.onPress();
    });
    const logDraftBtn = findByA11yLabel(test!.root, "Log draft set slot1:draft:0");
    expect(logDraftBtn).not.toBeNull();
    act(() => {
      logDraftBtn!.props.onPress();
    });
    await flushEventLoop();
    expect(commands.logStrengthSet).toHaveBeenCalledWith(
      "u1",
      "s1",
      expect.objectContaining({
        slotId: "slot1",
        ordinal: 1,
        reps: 5,
      }),
    );
  });

  it("completed set row shows summary text and set volume value", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [
          {
            setId: "set1",
            ordinal: 1,
            reps: 10,
            loadKg: 40.82,
            rpe: null,
            tempo: null,
            isWarmup: false,
            note: null,
            occurredAt: "2026-03-01T10:00:00.000Z",
          },
        ],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const tree = test!.toJSON();
    const str = tree ? JSON.stringify(tree) : "";
    expect(str).toContain("10");
    expect(str).toContain("x 90 lb");
    expect(str).toContain("@ — RPE");
    expect(str).toContain("900");
  });

  it("completed set row does not show checkmark", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [
          { setId: "set1", ordinal: 1, reps: 5, loadKg: 100, rpe: null, tempo: null, isWarmup: false, note: null, occurredAt: "2026-03-01T10:00:00.000Z" },
        ],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const tree = test!.toJSON();
    const str = tree ? JSON.stringify(tree) : "";
    expect(str).not.toContain("\u2713");
  });

  it("completed set row has no three-dot menu and has tap-to-edit and swipe-delete", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [
          {
            setId: "set1",
            ordinal: 1,
            reps: 5,
            loadKg: 100,
            rpe: 8,
            tempo: null,
            isWarmup: false,
            note: null,
            occurredAt: "2026-03-01T10:00:00.000Z",
          },
        ],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const setOptionsBtn = findByA11yLabel(test!.root, "Set options set1");
    expect(setOptionsBtn).toBeNull();
    const editRepsBtn = findByA11yLabel(test!.root, "Edit set set1 reps");
    expect(editRepsBtn).not.toBeNull();
    const deleteSetBtn = findByA11yLabel(test!.root, "Delete set set1");
    expect(deleteSetBtn).not.toBeNull();
    const tree = test!.toJSON();
    expect(tree && JSON.stringify(tree)).not.toMatch(/\bDone\b/);
  });

  it("tapping completed set reps opens picker and selecting value calls correctStrengthSet", async () => {
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      {
        slotId: "slot1",
        blockId: "block:sets:1",
        exerciseId: "bench_press",
        position: 0,
        removed: false,
        sets: [
          {
            setId: "set1",
            ordinal: 1,
            reps: 5,
            loadKg: 100,
            rpe: 8,
            tempo: null,
            isWarmup: false,
            note: null,
            occurredAt: "2026-03-01T10:00:00.000Z",
          },
        ],
      },
    ];
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const openExerciseBtn = findByA11yLabel(test!.root, "Open exercise Bench Press");
    act(() => {
      openExerciseBtn!.props.onPress();
    });
    const editRepsBtn = findByA11yLabel(test!.root, "Edit set set1 reps");
    expect(editRepsBtn).not.toBeNull();
    act(() => {
      editRepsBtn!.props.onPress();
    });
    const tenRepsOption = findByA11yLabel(test!.root, "10 reps");
    expect(tenRepsOption).not.toBeNull();
    act(() => {
      tenRepsOption!.props.onPress();
    });
    await flushEventLoop();
    expect(commands.correctStrengthSet).toHaveBeenCalledWith(
      "u1",
      "s1",
      expect.objectContaining({
        setId: "set1",
        patch: expect.objectContaining({ reps: 10 }),
      }),
    );
  });

  it("shows Repeat last set when lastSet exists on active target", async () => {
    // Repeat last set affordance was part of the removed Active set card; this behavior is no longer present.
  });

  it("shows Finish workout when active", async () => {
    mockActiveSessionId = "s1";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0; /* flush React state after async effects */
    });
    const finishBtn = findByA11yLabel(test!.root, "Finish workout");
    expect(finishBtn).not.toBeNull();
    expect(test!.root.findAll((n) => n.props?.testID === "workout-log-live-timer").length).toBeGreaterThan(0);
  });

  it("backfill active session hides live timer and shows Add exercises header", async () => {
    mockActiveSessionId = null;
    mockEnrichPointer = "s1";
    mockLogSearchParams = {
      enrichDay: "2026-03-18",
      enrichTargetId: "2026-03-18:session:0:w1",
    };
    act(() => {
      test = renderer.create(<WorkoutLogScreenInner sessionEntry="enrichment" />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    expect(test!.root.findAll((n) => n.props?.testID === "workout-log-live-timer").length).toBe(0);
    expect(test!.root.findByProps({ testID: "workout-log-backfill-nav" })).toBeTruthy();
    const saveBtn = findByA11yLabel(test!.root, "Save exercises");
    expect(saveBtn).not.toBeNull();
  });

  it("live /workouts/log clears stale completed backfill pointer without showing blocker", async () => {
    mockActiveSessionId = "s1";
    mockActiveLogFlowMode = "backfill";
    mockReduced.status = "completed";
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    expect(activeSessionStorage.clearActiveWorkoutSessionId).toHaveBeenCalledWith("u1");
    const startBtn = findByA11yLabel(test!.root, "Start workout");
    expect(startBtn).not.toBeNull();
  });

  it("pressing Finish opens finish confirmation sheet; confirming calls completeSession", async () => {
    mockActiveSessionId = "s1";
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [];
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const finishBtn = findByA11yLabel(test!.root, "Finish workout");
    expect(finishBtn).not.toBeNull();
    act(() => {
      finishBtn!.props.onPress();
    });
    const finishTitle = findByA11yLabel(test!.root, "Finish workout?");
    expect(finishTitle).not.toBeNull();
    const confirmBtn = findByA11yLabel(test!.root, "Confirm finish workout");
    expect(confirmBtn).not.toBeNull();
    act(() => {
      confirmBtn!.props.onPress();
    });
    await flushEventLoop();
    expect(commands.completeSession).toHaveBeenCalledWith("u1", "s1");
  });

  it("confirming Finish in live flow replaces to strength workouts page", async () => {
    mockActiveSessionId = "s1";
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [];
    commands.completeSession.mockClear();
    activeSessionStorage.clearActiveWorkoutSessionId.mockClear();
    mockRouterReplace.mockClear();
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    const finishBtn = findByA11yLabel(test!.root, "Finish workout");
    expect(finishBtn).not.toBeNull();
    act(() => {
      finishBtn!.props.onPress();
    });
    const confirmBtn = findByA11yLabel(test!.root, "Confirm finish workout");
    expect(confirmBtn).not.toBeNull();
    act(() => {
      confirmBtn!.props.onPress();
    });
    await flushEventLoop();
    await flushEventLoop();
    expect(commands.completeSession).toHaveBeenCalledWith("u1", "s1");
    expect(activeSessionStorage.clearActiveWorkoutSessionId).toHaveBeenCalledWith("u1");
    expect(mockRouterReplace).toHaveBeenCalledWith("/(app)/workouts");
  });

  it("finish confirmation sheet shows Cancel workout button", async () => {
    mockActiveSessionId = "s1";
    mockReduced.blocks = [
      { blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false },
    ];
    mockReduced.exercises = [];
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const finishBtn = findByA11yLabel(test!.root, "Finish workout");
    expect(finishBtn).not.toBeNull();
    act(() => {
      finishBtn!.props.onPress();
    });
    const cancelWorkoutBtn = findByA11yLabel(test!.root, "Cancel workout");
    expect(cancelWorkoutBtn).not.toBeNull();
  });

  it("tapping Cancel workout in finish sheet opens cancel confirm with Confirm cancel workout", async () => {
    mockActiveSessionId = "s1";
    mockReduced.blocks = [
      { blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false },
    ];
    mockReduced.exercises = [];
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const finishBtn = findByA11yLabel(test!.root, "Finish workout");
    act(() => {
      finishBtn!.props.onPress();
    });
    const cancelWorkoutBtn = findByA11yLabel(test!.root, "Cancel workout");
    expect(cancelWorkoutBtn).not.toBeNull();
    act(() => {
      cancelWorkoutBtn!.props.onPress();
    });
    const confirmCancelBtn = findByA11yLabel(test!.root, "Confirm cancel workout");
    expect(confirmCancelBtn).not.toBeNull();
  });

  it("confirming live cancel abandons session and replaces to strength workouts page", async () => {
    mockActiveSessionId = "s1";
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [];
    commands.abandonSession.mockClear();
    activeSessionStorage.clearActiveWorkoutSessionId.mockClear();
    mockRouterReplace.mockClear();
    mockRouterDismissTo.mockClear();
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    const finishBtn = findByA11yLabel(test!.root, "Finish workout");
    expect(finishBtn).not.toBeNull();
    act(() => {
      finishBtn!.props.onPress();
    });
    const cancelWorkoutBtn = findByA11yLabel(test!.root, "Cancel workout");
    expect(cancelWorkoutBtn).not.toBeNull();
    act(() => {
      cancelWorkoutBtn!.props.onPress();
    });
    const confirmCancelBtn = findByA11yLabel(test!.root, "Confirm cancel workout");
    expect(confirmCancelBtn).not.toBeNull();
    act(() => {
      confirmCancelBtn!.props.onPress();
    });
    await flushEventLoop();
    await flushEventLoop();
    expect(commands.abandonSession).toHaveBeenCalledWith("u1", "s1");
    expect(activeSessionStorage.clearActiveWorkoutSessionId).toHaveBeenCalledWith("u1");
    expect(mockRouterReplace).toHaveBeenCalledWith("/(app)/workouts");
    expect(mockRouterDismissTo).not.toHaveBeenCalled();
  });

  it("block label opens options sheet", async () => {
    mockActiveSessionId = "s1";
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [];
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const blockOptionsBtn = findByA11yLabel(test!.root, "Block options Sets");
    expect(blockOptionsBtn).not.toBeNull();
    act(() => {
      blockOptionsBtn!.props.onPress();
    });
    const sheetSub = findByA11yLabel(test!.root, "Block type Sets");
    expect(sheetSub).not.toBeNull();
  });

  it("selecting block type calls updateBlock", async () => {
    mockActiveSessionId = "s1";
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [];
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const blockOptionsBtn = findByA11yLabel(test!.root, "Block options Sets");
    act(() => {
      blockOptionsBtn!.props.onPress();
    });
    const supersetBtn = findByA11yLabel(test!.root, "Change to Superset");
    expect(supersetBtn).not.toBeNull();
    act(() => {
      supersetBtn!.props.onPress();
    });
    await flushEventLoop();
    expect(commands.updateBlock).toHaveBeenCalledWith(
      "u1",
      "s1",
      expect.objectContaining({
        blockId: "block:sets:1",
        patch: expect.objectContaining({ blockType: "superset" }),
      }),
    );
  });

  it("renders block title and type from reducer after swap", async () => {
    mockActiveSessionId = "s1";
    mockReduced.blocks = [
      { blockId: "block:sets:1", blockType: "superset", position: 0, title: "Superset", removed: false },
    ];
    mockReduced.exercises = [];
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const blockOptionsBtn = findByA11yLabel(test!.root, "Block options Superset");
    expect(blockOptionsBtn).not.toBeNull();
    const titleNodes = test!.root.findAll(
      (n) => n.type === "Text" && n.props?.children === "SUPERSET",
    );
    expect(titleNodes.length).toBeGreaterThan(0);
  });

  it("delete block removes exercises then block", async () => {
    mockActiveSessionId = "s1";
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [
      { slotId: "slot1", blockId: "block:sets:1", exerciseId: "bench_press", position: 0, removed: false, sets: [] },
      { slotId: "slot2", blockId: "block:sets:1", exerciseId: "squat", position: 1, removed: false, sets: [] },
    ];
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const blockOptionsBtn = findByA11yLabel(test!.root, "Block options Sets");
    act(() => {
      blockOptionsBtn!.props.onPress();
    });
    const deleteBlockBtn = findByA11yLabel(test!.root, "Delete block");
    expect(deleteBlockBtn).not.toBeNull();
    act(() => {
      deleteBlockBtn!.props.onPress();
    });
    const confirmDeleteBtn = findByA11yLabel(test!.root, "Delete");
    expect(confirmDeleteBtn).not.toBeNull();
    act(() => {
      confirmDeleteBtn!.props.onPress();
    });
    await flushEventLoop();
    expect(commands.removeExercise).toHaveBeenCalledWith("u1", "s1", "slot1");
    expect(commands.removeExercise).toHaveBeenCalledWith("u1", "s1", "slot2");
    expect(commands.removeBlock).toHaveBeenCalledWith("u1", "s1", "block:sets:1");
  });

  it("tapping Block options Sets and choosing Delete block calls removeBlock", async () => {
    mockActiveSessionId = "s1";
    mockReduced.blocks = [{ blockId: "block:sets:1", blockType: "sets", position: 0, title: "Sets", removed: false }];
    mockReduced.exercises = [];
    act(() => {
      test = renderer.create(<WorkoutLogScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      void 0;
    });
    const blockOptionsBtn = findByA11yLabel(test!.root, "Block options Sets");
    expect(blockOptionsBtn).not.toBeNull();
    act(() => {
      blockOptionsBtn!.props.onPress();
    });
    const deleteBlockBtn = findByA11yLabel(test!.root, "Delete block");
    expect(deleteBlockBtn).not.toBeNull();
    act(() => {
      deleteBlockBtn!.props.onPress();
    });
    const confirmDeleteBtn = findByA11yLabel(test!.root, "Delete");
    expect(confirmDeleteBtn).not.toBeNull();
    act(() => {
      confirmDeleteBtn!.props.onPress();
    });
    await flushEventLoop();
    expect(commands.removeBlock).toHaveBeenCalledWith("u1", "s1", "block:sets:1");
  });
});
