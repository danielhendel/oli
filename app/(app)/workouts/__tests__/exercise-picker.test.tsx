import React from "react";
import renderer, { act } from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";

jest.mock("react-native", () => {
  const React = require("react");
  return {
    View: "View",
    Text: "Text",
    TextInput: "TextInput",
    Pressable: "Pressable",
    Image: "Image",
    ScrollView: "ScrollView",
    FlatList: function FlatList({
      data,
      renderItem,
      keyExtractor,
      ListFooterComponent,
    }: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
      keyExtractor: (item: unknown, index: number) => string;
      ListFooterComponent?: React.ReactElement | null;
    }) {
      const body = (data || []).map((item, index) =>
        React.createElement(
          React.Fragment,
          { key: keyExtractor(item, index) },
          renderItem({ item, index }),
        ),
      );
      const footer = ListFooterComponent
        ? React.createElement(React.Fragment, { key: "footer" }, ListFooterComponent)
        : null;
      return React.createElement("View", {}, [...body, footer]);
    },
    Modal: function Modal({ children, visible }: { children: React.ReactNode; visible: boolean }) {
      if (!visible) return null;
      return React.createElement("View", {}, children);
    },
    StyleSheet: { create: (s: unknown) => s },
  };
});

jest.mock("@/lib/ui/ScreenStates", () => ({
  EmptyState: function EmptyState() {
    return null;
  },
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
  }),
}));

let mockSelectedGymId: string | null = null;
jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: {
      status: "ready",
      preferences: {
        units: { mass: "lb" },
        timezone: { mode: "recorded" },
        get selectedGymId() {
          return mockSelectedGymId;
        },
      },
    },
    refresh: jest.fn(),
    setMassUnit: jest.fn(),
    setSelectedGymId: jest.fn(),
  }),
}));

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockPickerParams: {
  sessionId?: string;
  blockId?: string;
  gymId?: string;
  logReturnPath?: string;
  enrichDay?: string;
  enrichTargetId?: string;
  sessionAnchorIso?: string;
  journalSessionId?: string;
} = { sessionId: "s1" };
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useLocalSearchParams: () => mockPickerParams,
  useNavigation: () => ({
    setOptions: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock("@/lib/workouts/exercises/customExerciseStore", () => ({
  listCustomExercises: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/workouts/exercises/librarySections", () => ({
  buildExerciseLibrarySections: jest.fn().mockResolvedValue({
    recentIds: ["bench_press"],
    popularIds: ["squat"],
  }),
}));

jest.mock("expo-video", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    VideoView: function VideoViewMock({ style }: { player?: unknown; style?: object }) {
      return React.createElement(View, { testID: "expo-video-mock-view", style });
    },
    useVideoPlayer: jest.fn((_source: unknown, setup?: (p: Record<string, unknown>) => void) => {
      const p = {
        loop: false,
        muted: false,
        play: jest.fn(),
        pause: jest.fn(),
      };
      setup?.(p);
      return p;
    }),
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: function MockIonicons() {
    return require("react").createElement("View", { testID: "mock-icon" });
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ExercisePickerScreen = require("../exercise-picker").default;

function findByA11yLabel(
  root: renderer.ReactTestRenderer["root"],
  label: string,
): renderer.ReactTestInstance | null {
  const pressables = root.findAllByType("Pressable");
  return pressables.find((p) => p.props.accessibilityLabel === label) ?? null;
}

async function flushEventLoop(): Promise<void> {
  await new Promise<void>((r) => setImmediate(r));
}

describe("workouts/exercise-picker", () => {
  let test: renderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
    mockReplace.mockClear();
    mockPush.mockClear();
    mockSelectedGymId = null;
    mockPickerParams = { sessionId: "s1" };
  });

  afterEach(() => {
    const t = test;
    test = null;
    if (t != null) {
      act(() => {
        t.unmount();
      });
    }
  });

  it("expect Pick Bench Press still exists", async () => {
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    const pickBench = findByA11yLabel(test!.root, "Pick Bench Press");
    expect(pickBench).not.toBeNull();
  });

  it("shows Create exercise CTA above search and opens create screen", async () => {
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    const createBtn = findByA11yLabel(test!.root, "Create exercise");
    expect(createBtn).not.toBeNull();
    act(() => {
      createBtn!.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/exercise-create",
      params: { sessionId: "s1" },
    });
  });

  it("switching tabs updates visible rows", async () => {
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    const tabRecent = findByA11yLabel(test!.root, "Tab Recent");
    const tabMyGym = findByA11yLabel(test!.root, "Tab My Gym");
    expect(tabRecent).not.toBeNull();
    expect(tabMyGym).not.toBeNull();
    act(() => {
      tabRecent!.props.onPress();
    });
    const pickBenchRecent = findByA11yLabel(test!.root, "Pick Bench Press");
    expect(pickBenchRecent).not.toBeNull();
    mockSelectedGymId = "edge_fitness_manchester_ct";
    act(() => {
      tabMyGym!.props.onPress();
    });
    act(() => {
      test!.update(<ExercisePickerScreen />);
    });
    const pickSquat = findByA11yLabel(test!.root, "Pick Back Squat");
    expect(pickSquat).not.toBeNull();
  });

  it("long press triggers router.replace", async () => {
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    expect(mockReplace).not.toHaveBeenCalled();
    const pickBench = findByA11yLabel(test!.root, "Pick Bench Press");
    expect(pickBench).not.toBeNull();
    act(() => {
      pickBench!.props.onLongPress?.();
    });
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/log",
      params: { sessionId: "s1", pickedExerciseId: "bench_press" },
    });
  });

  it("Add to workout replaces to enrich when logReturnPath is enrich", async () => {
    mockPickerParams = {
      sessionId: "s1",
      logReturnPath: "enrich",
      enrichDay: "2026-03-18",
      enrichTargetId: "2026-03-18:session:0:w1",
      sessionAnchorIso: "2026-03-18T12:00:00.000Z",
      journalSessionId: "journal-saved-1",
    };
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    const pickBench = findByA11yLabel(test!.root, "Pick Bench Press");
    act(() => {
      pickBench!.props.onPress();
    });
    const addButton = findByA11yLabel(test!.root, "Add to workout");
    act(() => {
      addButton!.props.onPress();
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/enrich",
      params: {
        sessionId: "s1",
        pickedExerciseId: "bench_press",
        enrichDay: "2026-03-18",
        enrichTargetId: "2026-03-18:session:0:w1",
        sessionAnchorIso: "2026-03-18T12:00:00.000Z",
        journalSessionId: "journal-saved-1",
      },
    });
  });

  it("microline renders expected text when filtering/searching", async () => {
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    const openFiltersBtn = findByA11yLabel(test!.root, "Open filters");
    expect(openFiltersBtn).not.toBeNull();
    act(() => {
      openFiltersBtn!.props.onPress();
    });
    const equipmentBarbell = findByA11yLabel(test!.root, "Equipment Barbell");
    expect(equipmentBarbell).not.toBeNull();
    act(() => {
      equipmentBarbell!.props.onPress();
    });
    const doneBtn = findByA11yLabel(test!.root, "Done");
    expect(doneBtn).not.toBeNull();
    act(() => {
      doneBtn!.props.onPress();
    });
    const texts = test!.root.findAllByType("Text").map((t) => (t.props?.children as string) ?? "");
    const microline = texts.find(
      (s) => typeof s === "string" && s.startsWith("Showing ") && s.includes("filters"),
    );
    expect(microline).toBeDefined();
    act(() => {
      const searchInput = test!.root.findByProps({ accessibilityLabel: "Exercise search" });
      searchInput.props.onChangeText("bench");
    });
    await flushEventLoop();
    act(() => {
      /* flush after search state */
    });
    const textsAfter = test!.root.findAllByType("Text").map((t) => (t.props?.children as string) ?? "");
    const microlineSearch = textsAfter.find(
      (s) => typeof s === "string" && s.startsWith("Showing ") && s.includes("Search"),
    );
    expect(microlineSearch).toBeDefined();
  });

  it("filter badge shows count of active filters", async () => {
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    const openFiltersBtn = findByA11yLabel(test!.root, "Open filters");
    expect(openFiltersBtn).not.toBeNull();
    const filterButtonTextsBefore = openFiltersBtn!.findAllByType("Text").map((t) => t.props?.children);
    const badgeBefore = filterButtonTextsBefore.find((c) => c === "1" || c === "2" || c === "3");
    expect(badgeBefore).toBeUndefined();
    act(() => {
      openFiltersBtn!.props.onPress();
    });
    const equipmentBarbell = findByA11yLabel(test!.root, "Equipment Barbell");
    act(() => {
      equipmentBarbell!.props.onPress();
    });
    const exerciseTypeStrength = findByA11yLabel(test!.root, "Exercise type Strength");
    expect(exerciseTypeStrength).not.toBeNull();
    act(() => {
      exerciseTypeStrength!.props.onPress();
    });
    const doneBtn = findByA11yLabel(test!.root, "Done");
    act(() => {
      doneBtn!.props.onPress();
    });
    const openFiltersBtnAfter = findByA11yLabel(test!.root, "Open filters");
    expect(openFiltersBtnAfter).not.toBeNull();
    const filterButtonTextsAfter = openFiltersBtnAfter!.findAllByType("Text").map((t) => t.props?.children);
    const badgeAfter = filterButtonTextsAfter.find((c) => c === "2");
    expect(badgeAfter).toBe("2");
  });

  it("search query highlights matching tokens in row title (nested Text spans)", async () => {
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    const textInput = test!.root.findByProps({ accessibilityLabel: "Exercise search" });
    act(() => {
      textInput.props.onChangeText("bench");
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush after search state */
    });
    const pickBench = findByA11yLabel(test!.root, "Pick Bench Press");
    expect(pickBench).not.toBeNull();
    const texts = pickBench!.findAllByType("Text");
    const titleWithNested = texts.find(
      (t) => Array.isArray(t.props?.children) && t.props.children.length > 1,
    );
    expect(titleWithNested).toBeDefined();
  });

  it("row press opens modal; Add to workout calls router.replace with pathname and pickedExerciseId", async () => {
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    expect(mockReplace).not.toHaveBeenCalled();
    const pickBench = findByA11yLabel(test!.root, "Pick Bench Press");
    expect(pickBench).not.toBeNull();
    act(() => {
      pickBench!.props.onPress();
    });
    expect(mockReplace).not.toHaveBeenCalled();
    const addButton = findByA11yLabel(test!.root, "Add to workout");
    expect(addButton).not.toBeNull();
    act(() => {
      addButton!.props.onPress();
    });
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(app)/workouts/log",
      params: { sessionId: "s1", pickedExerciseId: "bench_press" },
    });
  });

  it("no gym (selectedGymId null): full library visible, status shows Full library", async () => {
    mockSelectedGymId = null;
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    expect(findByA11yLabel(test!.root, "Pick Bench Press")).not.toBeNull();
    expect(findByA11yLabel(test!.root, "Pick Push-Up")).not.toBeNull();
    const scopeLabel = test!.root.findByProps({ accessibilityLabel: "Exercise library scope" });
    expect(scopeLabel.props.children).toBe("Full library");
  });

  it("My Gym tab with bodyweight_only_home: filtered status and only bodyweight exercises visible", async () => {
    mockSelectedGymId = "bodyweight_only_home";
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    const tabMyGym = findByA11yLabel(test!.root, "Tab My Gym");
    act(() => {
      tabMyGym!.props.onPress();
    });
    const scopeLabel = test!.root.findByProps({ accessibilityLabel: "Exercise library scope" });
    expect(scopeLabel.props.children).toContain("Filtered for");
    expect(scopeLabel.props.children).toContain("Bodyweight only (home)");
    expect(findByA11yLabel(test!.root, "Pick Bench Press")).toBeNull();
    expect(findByA11yLabel(test!.root, "Pick Push-Up")).not.toBeNull();
  });

  it("no gym selected: does not show gym filtering explanation", async () => {
    mockSelectedGymId = null;
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    const explanationNodes = test!.root.findAllByProps({ accessibilityLabel: "Gym filtering explanation" });
    expect(explanationNodes.length).toBe(0);
  });

  it("My Gym tab with selected gym: shows gym filtering explanation", async () => {
    mockSelectedGymId = "edge_fitness_manchester_ct";
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    const tabMyGym = findByA11yLabel(test!.root, "Tab My Gym");
    act(() => {
      tabMyGym!.props.onPress();
    });
    const explanationNodes = test!.root.findAllByProps({ accessibilityLabel: "Gym filtering explanation" });
    expect(explanationNodes.length).toBeGreaterThan(0);
  });

  it("no gym + search with no results: empty state without gym-aware hint", async () => {
    mockSelectedGymId = null;
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    const searchInput = test!.root.findByProps({ accessibilityLabel: "Exercise search" });
    act(() => {
      searchInput.props.onChangeText("xyznonexistentquery");
    });
    await flushEventLoop();
    act(() => {
      /* flush after search state */
    });
    const hintNodes = test!.root.findAllByProps({ accessibilityLabel: "Gym filtering empty state hint" });
    expect(hintNodes.length).toBe(0);
  });

  it("My Gym tab + gym selected + search with no visible results: shows gym-aware empty state hint", async () => {
    mockSelectedGymId = "bodyweight_only_home";
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    const tabMyGym = findByA11yLabel(test!.root, "Tab My Gym");
    act(() => {
      tabMyGym!.props.onPress();
    });
    const searchInput = test!.root.findByProps({ accessibilityLabel: "Exercise search" });
    act(() => {
      searchInput.props.onChangeText("---");
    });
    await flushEventLoop();
    act(() => {
      /* flush after search state */
    });
    const hintNodes = test!.root.findAllByProps({ accessibilityLabel: "Gym filtering empty state hint" });
    expect(hintNodes.length).toBeGreaterThan(0);
  });

  it("All tab is not gym-restricted: full library visible with gym selected", async () => {
    mockSelectedGymId = "bodyweight_only_home";
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    const scopeLabel = test!.root.findByProps({ accessibilityLabel: "Exercise library scope" });
    expect(scopeLabel.props.children).toBe("Full library");
    expect(findByA11yLabel(test!.root, "Pick Bench Press")).not.toBeNull();
    expect(findByA11yLabel(test!.root, "Pick Push-Up")).not.toBeNull();
  });

  it("My Gym tab with no gym selected: shows hint to select gym", async () => {
    mockSelectedGymId = null;
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    const tabMyGym = findByA11yLabel(test!.root, "Tab My Gym");
    act(() => {
      tabMyGym!.props.onPress();
    });
    const hintNode = test!.root.findByProps({ accessibilityLabel: "My Gym tab no gym selected hint" });
    expect(hintNode).not.toBeNull();
  });

  it("My Gym tab uses workout-flow gym from gymId param when present even if preferences have no gym", async () => {
    mockSelectedGymId = null;
    mockPickerParams = { sessionId: "s1", gymId: "edge_fitness_manchester_ct" };
    act(() => {
      test = renderer.create(<ExercisePickerScreen />);
    });
    await flushEventLoop();
    await flushEventLoop();
    act(() => {
      /* flush React state after async effects */
    });
    const tabMyGym = findByA11yLabel(test!.root, "Tab My Gym");
    act(() => {
      tabMyGym!.props.onPress();
    });
    const scopeLabel = test!.root.findByProps({ accessibilityLabel: "Exercise library scope" });
    expect(scopeLabel.props.children).toContain("Filtered for");
    expect(scopeLabel.props.children).toContain("Edge Fitness Manchester CT");
    expect(findByA11yLabel(test!.root, "Pick Back Squat")).not.toBeNull();
  });
});
