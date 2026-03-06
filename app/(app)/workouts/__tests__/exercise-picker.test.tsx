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

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ sessionId: "s1" }),
}));

jest.mock("@/lib/workouts/exercises/librarySections", () => ({
  buildExerciseLibrarySections: jest.fn().mockResolvedValue({
    recentIds: ["bench_press"],
    popularIds: ["squat"],
  }),
}));

jest.mock("expo-video");

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
  });

  afterEach(() => {
    test?.unmount();
    test = null;
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
    const tabPopular = findByA11yLabel(test!.root, "Tab Popular");
    expect(tabRecent).not.toBeNull();
    expect(tabPopular).not.toBeNull();
    act(() => {
      tabRecent!.props.onPress();
    });
    const pickBenchRecent = findByA11yLabel(test!.root, "Pick Bench Press");
    expect(pickBenchRecent).not.toBeNull();
    act(() => {
      tabPopular!.props.onPress();
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
});
