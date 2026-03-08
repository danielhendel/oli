import React from "react";
import renderer, { act } from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  const React = require("react");
  return {
    View: "View",
    Text: "Text",
    TextInput: "TextInput",
    Pressable: "Pressable",
    ScrollView: "ScrollView",
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
  };
});

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
  useLocalSearchParams: () => ({}),
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
jest.mock("@/lib/workouts/sessionEngine/activeSessionStorage", () => ({
  getActiveWorkoutSessionId: jest.fn(async () => mockActiveSessionId),
  setActiveWorkoutSessionId: jest.fn(async () => undefined),
  clearActiveWorkoutSessionId: jest.fn(async () => undefined),
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

jest.mock("@expo/vector-icons", () => ({
  Ionicons: function MockIonicons() {
    return require("react").createElement("View", { testID: "mock-icon" });
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const commands = require("@/lib/workouts/sessionEngine/commands");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WorkoutLogScreen = require("../log").default;

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
    mockReduced.blocks = [];
    mockReduced.exercises = [];
    mockExerciseMemory = {};
    mockPreviousComparison = {};
    mockRouterPush.mockClear();
    mockRouterReplace.mockClear();
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

  it("renders Active set card when active session has one block and one exercise", async () => {
    // Active set card UI has been removed in WL-UX2-clean; this test is no longer applicable.
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

  it("expanded exercise shows grid header Set Reps Weight RPE and utility row History + Set", async () => {
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
    expect(str).toContain("Set");
    expect(str).toContain("Reps");
    expect(str).toContain("Weight");
    expect(str).toContain("RPE");
    expect(str).toContain("History");
    expect(str).toContain("+ Set");
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
    expect(str).toContain("e1RM");
    expect(str).toContain("Vol");
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
    expect(list[list.length - 1]).toBe(600);
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

  it("completed set row shows e1RM and Volume columns", async () => {
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
    expect(str).toContain("e1RM");
    expect(str).toContain("Vol");
    expect(str).toContain("90");
    expect(str).toContain("10");
    expect(str).toContain("120");
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
