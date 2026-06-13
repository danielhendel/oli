import React, { act } from "react";
import { Modal, StyleSheet, Text } from "react-native";
import renderer from "react-test-renderer";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();

const mockUseLocalSearchParams = jest.fn(() => ({}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useNavigation: () => ({
    setOptions: mockSetOptions,
    goBack: mockGoBack,
  }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

import WorkoutBuilderRoute from "../workout/index";
import ProgramDesignSexRoute from "../workout/sex";
import ProgramDesignAgeRoute from "../workout/age";
import ProgramDesignTrainingLevelRoute from "../workout/training-level";
import ProgramDesignTrainingDaysRoute from "../workout/training-days";
import ProgramDesignGoalRoute from "../workout/goal";
import ProgramDesignTrainingTypeRoute from "../workout/training-type";
import ProgramDesignMuscleGroupVolumeRoute from "../workout/muscle-group-volume";
import ProgramDesignWeeklySplitRoute from "../workout/weekly-split";
import {
  buildMuscleGroupExercisePlan,
  getSelectedExercisesForMuscleGroup,
} from "@/lib/data/program/buildProgramExerciseRecommendations";
import { buildProgramDayWorkouts } from "@/lib/data/program/buildProgramDayWorkouts";
import { buildProgramOverviewMetrics } from "@/lib/data/program/programOverviewMetricExplainers";
import { buildProgrammingPrescriptionFromDraft } from "@/lib/data/program/buildProgrammingPrescription";
import { workoutProgramDesignStore } from "@/lib/data/program/workoutProgramDesignStore";
import {
  PROGRAM_DESIGN_MUSCLE_GROUP_ORDER,
  programDayWorkoutRoute,
  programMuscleGroupExercisesRoute,
} from "@/lib/data/program/workoutProgramDesignOptions";
import ProgramMuscleGroupExercisesRoute from "../workout/muscle-group/[muscleGroupId]/index";
import ProgramExerciseSlotSelectRoute from "../workout/muscle-group/[muscleGroupId]/exercise-slot/[slotId]";
import ProgramDayWorkoutRoute from "../workout/day/[dayId]";
import { GeneratedProgramCards } from "@/lib/ui/program/GeneratedProgramCards";

const mountedRenderers: renderer.ReactTestRenderer[] = [];

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockSetOptions.mockClear();
  mockUseLocalSearchParams.mockReturnValue({});
  act(() => {
    workoutProgramDesignStore.reset();
  });
});

afterEach(() => {
  act(() => {
    for (const r of mountedRenderers.splice(0)) r.unmount();
  });
});

function render(element: React.ReactElement): renderer.ReactTestRenderer {
  let test!: renderer.ReactTestRenderer;
  act(() => {
    test = renderer.create(element);
  });
  mountedRenderers.push(test);
  return test;
}

function findByTestId(
  test: renderer.ReactTestRenderer,
  testID: string,
): renderer.ReactTestInstance | undefined {
  return test.root.findAll((node) => node.props?.testID === testID)[0];
}

/** Host node only (filters out composite Pressable wrappers). */
function findHostByTestId(
  test: renderer.ReactTestRenderer,
  testID: string,
): renderer.ReactTestInstance | undefined {
  return test.root.findAll(
    (node) =>
      typeof node.type === "string" &&
      node.props?.testID === testID,
  )[0];
}

/** Pressable/composite node with an onPress handler (DailySleepCard pattern). */
function findPressableByTestId(
  test: renderer.ReactTestRenderer,
  testID: string,
): renderer.ReactTestInstance {
  const nodes = test.root.findAll((node) => node.props?.testID === testID);
  return (
    nodes.find((node) => typeof node.type !== "string" && typeof node.props?.onPress === "function") ??
    test.root.findByProps({ testID })
  );
}

function visibleMetricModal(
  test: renderer.ReactTestRenderer,
): renderer.ReactTestInstance | undefined {
  return test.root.findAllByType(Modal).find((modal) => modal.props.visible === true);
}

function collectText(node: renderer.ReactTestInstance): string {
  return node
    .findAllByType(Text)
    .map((textNode) => {
      const children = textNode.props.children;
      return typeof children === "string" ? children : "";
    })
    .join(" ");
}

function completeRequiredInputs(): void {
  act(() => {
    workoutProgramDesignStore.setSex("male");
    workoutProgramDesignStore.setTrainingLevel("intermediate");
    workoutProgramDesignStore.setTrainingDays(4);
    workoutProgramDesignStore.setTrainingType("hypertrophy");
  });
}

describe("Workout Builder landing (Program Design)", () => {
  it("applies the Activity-style stack header with left-aligned title", () => {
    render(<WorkoutBuilderRoute />);
    expect(mockSetOptions).toHaveBeenCalled();
    const options = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1]![0] as Record<
      string,
      unknown
    >;
    expect(options.title).toBe("Workout Builder");
    expect(options.headerTitleAlign).toBe("left");
    expect(typeof options.headerLeft).toBe("function");
  });

  it("renders a single Program Design card with the six category rows", () => {
    const test = render(<WorkoutBuilderRoute />);
    expect(findByTestId(test, "program-design-card")).toBeTruthy();
    for (const id of ["sex", "age", "trainingLevel", "trainingDays", "goal", "trainingType"]) {
      expect(findByTestId(test, `program-design-row-${id}`)).toBeTruthy();
    }
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Program Design");
    expect(str).toContain("Sex");
    expect(str).toContain("Age");
    expect(str).toContain("Training Level");
    expect(str).toContain("Training Days");
    expect(str).toContain("Goal");
    expect(str).toContain("Training Type");
  });

  it("shows 'Not set' defaults and the incomplete hint before generation", () => {
    const test = render(<WorkoutBuilderRoute />);
    const rows = test.root.findAll(
      (n) =>
        typeof n.type === "string" &&
        typeof n.props?.testID === "string" &&
        n.props.testID.startsWith("program-design-row-"),
    );
    expect(rows).toHaveLength(6);
    for (const row of rows) {
      expect(row.props.accessibilityLabel).toContain("Not set");
    }
    expect(findByTestId(test, "program-design-incomplete-hint")).toBeTruthy();
    expect(findByTestId(test, "generated-program-cards")).toBeFalsy();
  });

  it("Program Design rows use tighter spacing while keeping 44pt tap targets", () => {
    const test = render(<WorkoutBuilderRoute />);
    const row = findByTestId(test, "program-design-row-sex");
    const styleFn = row!.props.style as (state: { pressed: boolean }) => object[];
    const flat = StyleSheet.flatten(styleFn({ pressed: false }));
    expect(flat.minHeight).toBe(44);
    expect(flat.paddingVertical).toBe(10);
  });

  it("reflects selected values back on the card", () => {
    const test = render(<WorkoutBuilderRoute />);
    act(() => {
      workoutProgramDesignStore.setSex("female");
      workoutProgramDesignStore.setTrainingType("strength");
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Female");
    expect(str).toContain("Strength");
  });

  it("navigates to a category setup page when a row is pressed", () => {
    const test = render(<WorkoutBuilderRoute />);
    const row = findByTestId(test, "program-design-row-trainingType");
    act(() => {
      (row!.props.onPress as () => void)();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/program/workout/training-type");
  });

  it("renders three separate collapsible cards once required inputs are set", () => {
    completeRequiredInputs();
    const test = render(<WorkoutBuilderRoute />);
    expect(findByTestId(test, "generated-program-cards")).toBeTruthy();
    expect(findByTestId(test, "program-design-incomplete-hint")).toBeFalsy();
    expect(findByTestId(test, "generated-overview-card")).toBeTruthy();
    expect(findByTestId(test, "generated-muscle-volume-card")).toBeTruthy();
    expect(findByTestId(test, "generated-weekly-split-card")).toBeTruthy();
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Program Overview");
    expect(str).toContain("Muscle Group Volume");
    expect(str).toContain("Weekly Split");
    expect(str).toContain("129"); // Male Intermediate total weekly sets
    expect(str).toContain("5–15"); // hypertrophy intermediate rep range
    expect(str).toContain("Double progression");
  });

  const OVERVIEW_ROW_IDS = [
    "overview-stat-total_weekly_sets",
    "overview-stat-frequency",
    "overview-stat-rep_range",
    "overview-stat-rir_target",
    "overview-stat-rpe_target",
    "overview-stat-progression",
  ] as const;

  it("Program Overview renders all six metric rows as tappable value + chevron buttons", () => {
    completeRequiredInputs();
    const test = render(<WorkoutBuilderRoute />);
    for (const id of OVERVIEW_ROW_IDS) {
      const row = findHostByTestId(test, id);
      expect(row).toBeTruthy();
      expect(row!.props.accessibilityRole).toBe("button");
      expect(typeof findPressableByTestId(test, id)!.props.onPress).toBe("function");
      expect(row!.props.accessibilityLabel).toContain("Double tap to learn more");
    }
  });

  it("Program Overview no longer renders inline info icons or explainer paragraphs", () => {
    completeRequiredInputs();
    const test = render(<WorkoutBuilderRoute />);
    for (const id of OVERVIEW_ROW_IDS) {
      expect(findByTestId(test, `${id}-info`)).toBeFalsy();
      expect(findByTestId(test, `${id}-explainer`)).toBeFalsy();
    }
    // The structured copy must live only in the modal (hidden until a row is tapped).
    const draft = workoutProgramDesignStore.getSnapshot();
    const prescription = buildProgrammingPrescriptionFromDraft(draft)!;
    const metrics = buildProgramOverviewMetrics(prescription);
    const str = JSON.stringify(test.toJSON());
    for (const metric of metrics) {
      expect(str).not.toContain(metric.explainer.whatIsIt);
      expect(str).not.toContain(metric.explainer.whatToWatchNext);
    }
  });

  it("uses a concise descriptive Program Overview subtitle (not a raw set count)", () => {
    completeRequiredInputs();
    const draft = workoutProgramDesignStore.getSnapshot();
    const prescription = buildProgrammingPrescriptionFromDraft(draft)!;
    const test = render(<WorkoutBuilderRoute />);
    const header = findByTestId(test, "generated-overview-card-header");
    const headerText = collectText(header!);
    expect(headerText).toContain("Volume, intensity, and progression targets");
    expect(headerText).not.toContain(`${prescription.totalWeeklySets} sets/week`);
    expect(headerText).not.toMatch(/\d+\s*sets\/week/);
  });

  const SECTION_HEADINGS = [
    "What this is",
    "Why it matters",
    "What your value means",
    "How to use this",
    "What to watch next",
  ] as const;

  function openMetricSheet(
    prescription: ReturnType<typeof buildProgrammingPrescriptionFromDraft>,
    metricId: Parameters<typeof GeneratedProgramCards>[0]["initialActiveMetricId"],
  ): string {
    let sheetTest!: renderer.ReactTestRenderer;
    act(() => {
      sheetTest = renderer.create(
        <GeneratedProgramCards
          prescription={prescription!}
          muscleExerciseContext={{
            exerciseCountOverrides: {},
            exerciseSelectionOverrides: {},
            trainingDayOverrides: {},
            slotDayOverrides: {},
          }}
          onOpenMuscleVolume={jest.fn()}
          onOpenWeeklySplit={jest.fn()}
          onOpenMuscleExercises={jest.fn()}
          onOpenDay={jest.fn()}
          initialActiveMetricId={metricId}
        />,
      );
    });
    mountedRenderers.push(sheetTest);
    const modal = visibleMetricModal(sheetTest);
    expect(modal).toBeDefined();
    return collectText(modal!);
  }

  it("tapping Total weekly sets opens a structured explainer with all five sections and close", () => {
    completeRequiredInputs();
    const draft = workoutProgramDesignStore.getSnapshot();
    const prescription = buildProgrammingPrescriptionFromDraft(draft)!;
    const totalMetric = buildProgramOverviewMetrics(prescription)[0]!;
    const test = render(<WorkoutBuilderRoute />);

    const totalRow = test.root.findByProps({ testID: "overview-stat-total_weekly_sets" });
    act(() => {
      (totalRow.props.onPress as () => void)();
    });
    expect(typeof totalRow.props.onPress).toBe("function");

    const modalText = openMetricSheet(prescription, "total_weekly_sets");
    expect(modalText).toContain(totalMetric.explainer.title);
    expect(modalText).toContain(totalMetric.explainer.currentValue);
    for (const heading of SECTION_HEADINGS) {
      expect(modalText).toContain(heading);
    }
    expect(modalText).toContain("hard working set");
    expect(modalText.toLowerCase()).toContain("weekly training workload");
    expect(modalText).toContain("Done");
  });

  it("RIR explainer teaches reps in reserve; RPE explainer uses the 1–10 scale", () => {
    completeRequiredInputs();
    const draft = workoutProgramDesignStore.getSnapshot();
    const prescription = buildProgrammingPrescriptionFromDraft(draft)!;

    const rirText = openMetricSheet(prescription, "rir_target");
    expect(rirText).toContain("Reps In Reserve");
    for (const heading of SECTION_HEADINGS) {
      expect(rirText).toContain(heading);
    }

    const rpeText = openMetricSheet(prescription, "rpe_target");
    expect(rpeText).toContain("1–10");
  });

  it("tapping Progression opens a structured explainer that says when to progress", () => {
    completeRequiredInputs();
    const draft = workoutProgramDesignStore.getSnapshot();
    const prescription = buildProgrammingPrescriptionFromDraft(draft)!;
    const progressionMetric = buildProgramOverviewMetrics(prescription).find(
      (m) => m.id === "progression",
    )!;
    const test = render(<WorkoutBuilderRoute />);

    const progressionRow = test.root.findByProps({ testID: "overview-stat-progression" });
    act(() => {
      (progressionRow.props.onPress as () => void)();
    });
    expect(typeof progressionRow.props.onPress).toBe("function");

    const modalText = openMetricSheet(prescription, "progression");
    expect(modalText).toContain(progressionMetric.explainer.title);
    expect(modalText).toContain(prescription.progressionModel);
    for (const heading of SECTION_HEADINGS) {
      expect(modalText).toContain(heading);
    }
    // Tells the user when they've earned the increase.
    expect(modalText.toLowerCase()).toMatch(/progress only|earn|when they're all met|on target/);
  });

  it("Program Overview card collapse still works", () => {
    completeRequiredInputs();
    const test = render(<WorkoutBuilderRoute />);
    const overviewHeader = findByTestId(test, "generated-overview-card-header");
    // Overview is expanded by default → rows visible.
    expect(findByTestId(test, "generated-overview-card-body")).toBeTruthy();
    expect(findByTestId(test, "overview-stat-total_weekly_sets")).toBeTruthy();
    act(() => {
      (overviewHeader!.props.onPress as () => void)();
    });
    expect(findByTestId(test, "generated-overview-card-body")).toBeFalsy();
    expect(findByTestId(test, "overview-stat-total_weekly_sets")).toBeFalsy();
  });

  it("Muscle Group Volume and Weekly Split cards collapse and expand", () => {
    completeRequiredInputs();
    const test = render(<WorkoutBuilderRoute />);
    const muscleHeader = findByTestId(test, "generated-muscle-volume-card-header");
    const splitHeader = findByTestId(test, "generated-weekly-split-card-header");

    expect(findByTestId(test, "generated-muscle-volume-card-body")).toBeFalsy();
    act(() => {
      (muscleHeader!.props.onPress as () => void)();
    });
    expect(findByTestId(test, "generated-muscle-volume-card-body")).toBeTruthy();
    act(() => {
      (muscleHeader!.props.onPress as () => void)();
    });
    expect(findByTestId(test, "generated-muscle-volume-card-body")).toBeFalsy();

    expect(findByTestId(test, "generated-weekly-split-card-body")).toBeFalsy();
    act(() => {
      (splitHeader!.props.onPress as () => void)();
    });
    expect(findByTestId(test, "generated-weekly-split-card-body")).toBeTruthy();
  });

  it("edit links navigate to the customization pages", () => {
    completeRequiredInputs();
    const test = render(<WorkoutBuilderRoute />);
    act(() => {
      (findByTestId(test, "generated-muscle-volume-card-header")!.props.onPress as () => void)();
    });
    act(() => {
      (findByTestId(test, "generated-open-muscle-volume")!.props.onPress as () => void)();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/program/workout/muscle-group-volume");
    act(() => {
      (findByTestId(test, "generated-weekly-split-card-header")!.props.onPress as () => void)();
    });
    act(() => {
      (findByTestId(test, "generated-open-weekly-split")!.props.onPress as () => void)();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/program/workout/weekly-split");
  });

  it("Muscle Group Volume card rows render as tappable value + chevron buttons", () => {
    completeRequiredInputs();
    const test = render(<WorkoutBuilderRoute />);
    act(() => {
      (findByTestId(test, "generated-muscle-volume-card-header")!.props.onPress as () => void)();
    });
    const trained = buildProgrammingPrescriptionFromDraft(
      workoutProgramDesignStore.getSnapshot(),
    )!.muscles.filter((m) => m.weeklySets > 0);
    for (const muscle of trained) {
      const row = findHostByTestId(test, `generated-muscle-${muscle.muscleGroupId}`);
      expect(row).toBeTruthy();
      expect(row!.props.accessibilityRole).toBe("button");
      expect(typeof findPressableByTestId(test, `generated-muscle-${muscle.muscleGroupId}`)!.props.onPress).toBe(
        "function",
      );
      expect(row!.props.accessibilityLabel).toContain(`Open ${muscle.label} exercises`);
    }
  });

  it("tapping a muscle group opens exercise selection via onOpenMuscleExercises", () => {
    completeRequiredInputs();
    const prescription = buildProgrammingPrescriptionFromDraft(
      workoutProgramDesignStore.getSnapshot(),
    )!;
    const onOpenMuscleExercises = jest.fn();
    let cardsTest!: renderer.ReactTestRenderer;
    act(() => {
      cardsTest = renderer.create(
        <GeneratedProgramCards
          prescription={prescription}
          muscleExerciseContext={{
            exerciseCountOverrides: {},
            exerciseSelectionOverrides: {},
            trainingDayOverrides: {},
            slotDayOverrides: {},
          }}
          onOpenMuscleVolume={jest.fn()}
          onOpenWeeklySplit={jest.fn()}
          onOpenMuscleExercises={onOpenMuscleExercises}
          onOpenDay={jest.fn()}
        />,
      );
    });
    mountedRenderers.push(cardsTest);
    act(() => {
      (findByTestId(cardsTest, "generated-muscle-volume-card-header")!.props.onPress as () => void)();
    });
    const upperChestPressable = findPressableByTestId(cardsTest, "generated-muscle-upper_chest");
    act(() => {
      (upperChestPressable.props.onPress as () => void)();
    });
    expect(onOpenMuscleExercises).toHaveBeenCalledWith("upper_chest");
  });

  it("programMuscleGroupExercisesRoute builds the stack path for navigation", () => {
    expect(programMuscleGroupExercisesRoute("upper_chest")).toBe(
      "/(app)/program/workout/muscle-group/upper_chest",
    );
    expect(programMuscleGroupExercisesRoute("lats")).toBe(
      "/(app)/program/workout/muscle-group/lats",
    );
  });
});

describe("Muscle group exercise selection", () => {
  it("renders tappable metric rows and empty exercise slots for Upper Chest", () => {
    completeRequiredInputs();
    mockUseLocalSearchParams.mockReturnValue({ muscleGroupId: "upper_chest" });
    const test = render(<ProgramMuscleGroupExercisesRoute />);
    const prescription = buildProgrammingPrescriptionFromDraft(
      workoutProgramDesignStore.getSnapshot(),
    )!;
    const plan = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId: "upper_chest",
    });
    expect(findByTestId(test, "muscle-exercises-metrics-card")).toBeTruthy();
    expect(findByTestId(test, "muscle-metric-weekly-set-target")).toBeTruthy();
    expect(findByTestId(test, "muscle-metric-frequency")).toBeTruthy();
    expect(findByTestId(test, "muscle-metric-exercise-count")).toBeTruthy();
    expect(findByTestId(test, "muscle-metric-training-days")).toBeTruthy();
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Number of exercises");
    expect(str).not.toContain("Recommended exercises");
    expect(str).toContain("Select exercise");
    expect(str).not.toContain("Recommended");
    for (const slot of plan.slots) {
      expect(findByTestId(test, `muscle-exercise-slot-${slot.slotId}`)).toBeTruthy();
      expect(findByTestId(test, `muscle-exercise-select-${slot.slotId}`)).toBeTruthy();
    }
  });

  it("no specific exercises are preselected by default", () => {
    completeRequiredInputs();
    const prescription = buildProgrammingPrescriptionFromDraft(
      workoutProgramDesignStore.getSnapshot(),
    )!;
    const plan = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId: "upper_chest",
    });
    for (const slot of plan.slots) {
      expect(slot.selectedExerciseId).toBeNull();
      expect(slot.source).toBe("empty");
    }
  });

  it("selecting an exercise stores stable exercise id in draft store", () => {
    completeRequiredInputs();
    const prescription = buildProgrammingPrescriptionFromDraft(
      workoutProgramDesignStore.getSnapshot(),
    )!;
    const plan = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId: "lats",
    });
    const slotId = plan.slots[0]!.slotId;
    const exerciseId = "lat_pulldown";

    act(() => {
      workoutProgramDesignStore.setExerciseSelection("lats", slotId, exerciseId);
    });

    const updated = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId: "lats",
      selections: workoutProgramDesignStore.getSnapshot().exerciseSelectionOverrides,
    });
    expect(updated.slots[0]!.selectedExerciseId).toBe(exerciseId);
    expect(updated.slots[0]!.source).toBe("manual");
    expect(workoutProgramDesignStore.getSnapshot().exerciseSelectionOverrides.lats?.[slotId]).toBe(
      exerciseId,
    );
  });

  it("editing weekly set target updates draft store", () => {
    completeRequiredInputs();
    act(() => {
      workoutProgramDesignStore.setMuscleVolumeOverride("upper_chest", 10);
    });
    expect(workoutProgramDesignStore.getSnapshot().muscleVolumeOverrides.upper_chest).toBe(10);
    const prescription = buildProgrammingPrescriptionFromDraft(
      workoutProgramDesignStore.getSnapshot(),
    )!;
    const plan = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId: "upper_chest",
    });
    expect(plan.settings.weeklySetTarget).toBe(10);
  });

  it("editing exercise count changes slot count", () => {
    completeRequiredInputs();
    act(() => {
      workoutProgramDesignStore.setExerciseCountOverride("upper_chest", 3);
    });
    const prescription = buildProgrammingPrescriptionFromDraft(
      workoutProgramDesignStore.getSnapshot(),
    )!;
    const plan = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId: "upper_chest",
      exerciseCountOverride: 3,
    });
    expect(plan.slots).toHaveLength(3);
    expect(plan.settings.exerciseCount).toBe(3);
  });

  it("Muscle Group Volume card shows selected exercises under the muscle group", () => {
    completeRequiredInputs();
    const prescription = buildProgrammingPrescriptionFromDraft(
      workoutProgramDesignStore.getSnapshot(),
    )!;
    const plan = buildMuscleGroupExercisePlan({
      prescription,
      muscleGroupId: "upper_chest",
    });
    const slotId = plan.slots[0]!.slotId;
    act(() => {
      workoutProgramDesignStore.setExerciseSelection("upper_chest", slotId, "incline_bench_press");
    });
    const draft = workoutProgramDesignStore.getSnapshot();
    let cardsTest!: renderer.ReactTestRenderer;
    act(() => {
      cardsTest = renderer.create(
        <GeneratedProgramCards
          prescription={prescription}
          muscleExerciseContext={{
            exerciseCountOverrides: draft.exerciseCountOverrides,
            exerciseSelectionOverrides: draft.exerciseSelectionOverrides,
            trainingDayOverrides: draft.trainingDayOverrides,
            slotDayOverrides: draft.slotDayOverrides,
          }}
          onOpenMuscleVolume={jest.fn()}
          onOpenWeeklySplit={jest.fn()}
          onOpenMuscleExercises={jest.fn()}
          onOpenDay={jest.fn()}
        />,
      );
    });
    mountedRenderers.push(cardsTest);
    act(() => {
      (findByTestId(cardsTest, "generated-muscle-volume-card-header")!.props.onPress as () => void)();
    });
    expect(
      findByTestId(cardsTest, "generated-muscle-exercise-upper_chest-incline_bench_press"),
    ).toBeTruthy();
    const str = JSON.stringify(cardsTest.toJSON());
    expect(str).toContain("Incline Bench Press");
    const selected = getSelectedExercisesForMuscleGroup({
      prescription,
      muscleGroupId: "upper_chest",
      selections: draft.exerciseSelectionOverrides,
    });
    expect(str).toContain(String(selected[0]!.sets));
  });
});

describe("Select Exercise page search", () => {
  function renderSlotSelect(muscleGroupId: string, slotId: string): renderer.ReactTestRenderer {
    completeRequiredInputs();
    mockUseLocalSearchParams.mockReturnValue({ muscleGroupId, slotId });
    return render(<ProgramExerciseSlotSelectRoute />);
  }

  it("renders a search input with the 'Search exercises' accessibility label", () => {
    const test = renderSlotSelect("upper_chest", "upper_chest-slot-1");
    const input = findByTestId(test, "exercise-select-search-input");
    expect(input).toBeTruthy();
    expect(input!.props.accessibilityLabel).toBe("Search exercises");
  });

  it("filters the option list by exercise name while keeping the muscle filter active", () => {
    const test = renderSlotSelect("upper_chest", "upper_chest-slot-1");
    const before = JSON.stringify(test.toJSON());
    expect(before).toContain("Incline Bench Press");
    act(() => {
      (findByTestId(test, "exercise-select-search-input")!.props.onChangeText as (t: string) => void)(
        "incline bench",
      );
    });
    const after = JSON.stringify(test.toJSON());
    expect(after).toContain("Incline Bench Press");
    // A non-incline upper-chest option drops out of the filtered list.
    expect(after).not.toContain("Low Cable Chest Fly");
  });

  it("shows the 'No matching exercises' empty state for an unmatched query", () => {
    const test = renderSlotSelect("upper_chest", "upper_chest-slot-1");
    act(() => {
      (findByTestId(test, "exercise-select-search-input")!.props.onChangeText as (t: string) => void)(
        "zzzznotanexercise",
      );
    });
    expect(findByTestId(test, "exercise-select-no-matches")).toBeTruthy();
    expect(JSON.stringify(test.toJSON())).toContain("No matching exercises");
  });

  it("selecting a searched exercise stores its stable id and navigates back", () => {
    const test = renderSlotSelect("upper_chest", "upper_chest-slot-1");
    act(() => {
      (findByTestId(test, "exercise-select-search-input")!.props.onChangeText as (t: string) => void)(
        "incline bench press",
      );
    });
    act(() => {
      (findByTestId(test, "exercise-select-option-incline_bench_press")!.props.onPress as () => void)();
    });
    expect(
      workoutProgramDesignStore.getSnapshot().exerciseSelectionOverrides.upper_chest?.[
        "upper_chest-slot-1"
      ],
    ).toBe("incline_bench_press");
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe("Weekly Split card → day workout navigation", () => {
  it("renders each day as a tappable chevron row with exercise + set counts", () => {
    completeRequiredInputs();
    const test = render(<WorkoutBuilderRoute />);
    act(() => {
      (findByTestId(test, "generated-weekly-split-card-header")!.props.onPress as () => void)();
    });
    for (const dayId of ["day-1", "day-2", "day-3", "day-4"]) {
      const row = findHostByTestId(test, `generated-split-${dayId}`);
      expect(row).toBeTruthy();
      expect(row!.props.accessibilityRole).toBe("button");
    }
    // Day rows summarize exercise + set counts.
    expect(JSON.stringify(test.toJSON())).toContain("exercises ·");
  });

  it("tapping a day row navigates to that day's workout page", () => {
    completeRequiredInputs();
    const test = render(<WorkoutBuilderRoute />);
    act(() => {
      (findByTestId(test, "generated-weekly-split-card-header")!.props.onPress as () => void)();
    });
    act(() => {
      (findPressableByTestId(test, "generated-split-day-1").props.onPress as () => void)();
    });
    expect(mockPush).toHaveBeenCalledWith(programDayWorkoutRoute("day-1"));
  });
});

describe("Day workout page", () => {
  function renderDay(dayId: string): renderer.ReactTestRenderer {
    completeRequiredInputs();
    mockUseLocalSearchParams.mockReturnValue({ dayId });
    return render(<ProgramDayWorkoutRoute />);
  }

  it("renders the day name, total exercises, and total sets", () => {
    const test = renderDay("day-1");
    expect(findByTestId(test, "day-workout-summary")).toBeTruthy();
    expect(findByTestId(test, "day-workout-totals")).toBeTruthy();
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("exercises");
    expect(str).toContain("sets");
  });

  it("renders empty (selectable) slots that open the Select Exercise page on Select", () => {
    const test = renderDay("day-1");
    const slotCard = findByTestId(test, "day-workout-slots-card");
    expect(slotCard).toBeTruthy();
    const selectBtn = test.root
      .findAll(
        (node) =>
          typeof node.props?.testID === "string" &&
          node.props.testID.startsWith("day-slot-select-") &&
          typeof node.props?.onPress === "function",
      )[0];
    expect(selectBtn).toBeTruthy();
    act(() => {
      (selectBtn!.props.onPress as () => void)();
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(String(mockPush.mock.calls[0]![0])).toContain("/exercise-slot/");
  });

  it("moving an exercise to another day updates the draft store", () => {
    const test = renderDay("day-1");
    const moveBtn = test.root.findAll(
      (node) =>
        typeof node.props?.testID === "string" &&
        node.props.testID.startsWith("day-slot-move-") &&
        typeof node.props?.onPress === "function",
    )[0];
    expect(moveBtn).toBeTruthy();
    const movedSlotId = (moveBtn!.props.testID as string).replace("day-slot-move-", "");
    const muscleGroupId = movedSlotId.slice(0, movedSlotId.indexOf("-slot-"));
    act(() => {
      (moveBtn!.props.onPress as () => void)();
    });
    // The move sheet lists the other days; choose Day 2.
    act(() => {
      (findPressableByTestId(test, "day-move-target-day-2").props.onPress as () => void)();
    });
    const overrides = workoutProgramDesignStore.getSnapshot().slotDayOverrides;
    expect(overrides[muscleGroupId as keyof typeof overrides]?.[movedSlotId]).toBe("day-2");
  });

  it("a selected exercise on the day reflects its stable id and a Swap action", () => {
    completeRequiredInputs();
    // Pre-select an exercise for a slot, then open the day it lands on.
    act(() => {
      workoutProgramDesignStore.setExerciseSelection(
        "upper_chest",
        "upper_chest-slot-1",
        "incline_bench_press",
      );
    });
    const draft = workoutProgramDesignStore.getSnapshot();
    const prescription = buildProgrammingPrescriptionFromDraft(draft)!;
    const dayWorkouts = buildProgramDayWorkouts({
      prescription,
      exerciseCountOverrides: draft.exerciseCountOverrides,
      trainingDayOverrides: draft.trainingDayOverrides,
      exerciseSelectionOverrides: draft.exerciseSelectionOverrides,
      slotDayOverrides: draft.slotDayOverrides,
    });
    const dayId = dayWorkouts.find((day) =>
      day.slots.some((slot) => slot.slotId === "upper_chest-slot-1"),
    )!.dayId;
    mockUseLocalSearchParams.mockReturnValue({ dayId });
    const test = render(<ProgramDayWorkoutRoute />);
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Incline Bench Press");
    expect(str).toContain("Swap");
  });
});

describe("Program Design category setup pages", () => {
  it("Sex page renders Male/Female and writes + navigates back", () => {
    const test = render(<ProgramDesignSexRoute />);
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Male");
    expect(str).toContain("Female");
    act(() => {
      (findByTestId(test, "program-sex-option-female")!.props.onPress as () => void)();
    });
    expect(workoutProgramDesignStore.getSnapshot().sex).toBe("female");
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("Age page supports 13–90 years", () => {
    const test = render(<ProgramDesignAgeRoute />);
    expect(findByTestId(test, "program-age-option-13")).toBeTruthy();
    expect(findByTestId(test, "program-age-option-90")).toBeTruthy();
    act(() => {
      (findByTestId(test, "program-age-option-28")!.props.onPress as () => void)();
    });
    expect(workoutProgramDesignStore.getSnapshot().age).toBe(28);
  });

  it("Training Level page renders the five tiers with coach explainers", () => {
    const test = render(<ProgramDesignTrainingLevelRoute />);
    const str = JSON.stringify(test.toJSON());
    for (const label of ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"]) {
      expect(str).toContain(label);
    }
    expect(str).toContain("learning technique and consistency");
    expect(str).toContain("highly individualized programming");
  });

  it("Training Days page supports 2–6 days", () => {
    const test = render(<ProgramDesignTrainingDaysRoute />);
    for (const n of [2, 3, 4, 5, 6]) {
      expect(findByTestId(test, `program-training-days-option-${n}`)).toBeTruthy();
    }
    act(() => {
      (findByTestId(test, "program-training-days-option-5")!.props.onPress as () => void)();
    });
    expect(workoutProgramDesignStore.getSnapshot().trainingDays).toBe(5);
  });

  it("Goal page renders the five goals with coach explainers", () => {
    const test = render(<ProgramDesignGoalRoute />);
    const str = JSON.stringify(test.toJSON());
    for (const label of ["General Health", "Build Muscle", "Gain Strength", "Lose Fat"]) {
      expect(str).toContain(label);
    }
    expect(str).toContain("Maximize hypertrophy with progressive volume");
    expect(str).toContain("Preserve muscle while improving energy balance");
  });

  it("Training Type page renders exactly the six options with coach explainers", () => {
    const test = render(<ProgramDesignTrainingTypeRoute />);
    const str = JSON.stringify(test.toJSON());
    for (const label of [
      "General Fitness",
      "Hypertrophy",
      "Strength",
      "Powerlifting",
      "Athletic Performance",
      "Conditioning",
    ]) {
      expect(str).toContain(label);
    }
    expect(str).toContain("Muscle growth and physique development");
    expect(str).toContain("Work capacity, circuits, density");
    act(() => {
      (findByTestId(test, "program-training-type-option-powerlifting")!.props.onPress as () => void)();
    });
    expect(workoutProgramDesignStore.getSnapshot().trainingType).toBe("powerlifting");
  });
});

describe("Muscle Group Volume (generated)", () => {
  it("shows the completion hint before required inputs are set", () => {
    const test = render(<ProgramDesignMuscleGroupVolumeRoute />);
    expect(findByTestId(test, "muscle-volume-empty-hint")).toBeTruthy();
    expect(findByTestId(test, "muscle-volume-list-card")).toBeFalsy();
  });

  it("renders generated values, total, and all 20 muscle rows once complete", () => {
    completeRequiredInputs();
    const test = render(<ProgramDesignMuscleGroupVolumeRoute />);
    expect(findByTestId(test, "muscle-volume-summary")).toBeTruthy();
    const str = JSON.stringify(test.toJSON());
    // React renders the label + value as separate text nodes, so assert the parts.
    expect(str).toContain("Total weekly sets: ");
    expect(str).toContain('"129"');
    for (const id of PROGRAM_DESIGN_MUSCLE_GROUP_ORDER) {
      expect(findByTestId(test, `muscle-volume-row-${id}`)).toBeTruthy();
    }
    expect(PROGRAM_DESIGN_MUSCLE_GROUP_ORDER).toHaveLength(20);
  });

  it("keeps -/+ controls that write a manual override and flag the row Edited", () => {
    completeRequiredInputs();
    const test = render(<ProgramDesignMuscleGroupVolumeRoute />);
    const row = findByTestId(test, "muscle-volume-row-quads");
    const decrementBtn = row!.findAll(
      (n) =>
        typeof n.props?.accessibilityLabel === "string" &&
        n.props.accessibilityLabel.includes("Decrease"),
    )[0];
    act(() => {
      (decrementBtn!.props.onPress as () => void)();
    });
    // Male Intermediate Hypertrophy quads = 14 → 13 after one decrement.
    expect(workoutProgramDesignStore.getSnapshot().muscleVolumeOverrides.quads).toBe(13);
    expect(findByTestId(test, "muscle-volume-edited-quads")).toBeTruthy();
  });
});

describe("Weekly Split (generated)", () => {
  it("shows the completion hint before required inputs are set", () => {
    const test = render(<ProgramDesignWeeklySplitRoute />);
    expect(findByTestId(test, "weekly-split-empty-hint")).toBeTruthy();
  });

  it("renders the generated day structure and supports renaming", () => {
    completeRequiredInputs();
    const test = render(<ProgramDesignWeeklySplitRoute />);
    // 4-day split defaults to Day 1 / Day 2 / Day 3 / Day 4
    for (const dayId of ["day-1", "day-2", "day-3", "day-4"]) {
      expect(findByTestId(test, `weekly-split-day-${dayId}`)).toBeTruthy();
    }
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Day 1");
    expect(str).toContain("Day 4");

    const input = findByTestId(test, "weekly-split-day-input-day-1");
    act(() => {
      (input!.props.onChangeText as (t: string) => void)("My Push");
    });
    expect(workoutProgramDesignStore.getSnapshot().splitDayNameOverrides["day-1"]).toBe("My Push");
    expect(findByTestId(test, "weekly-split-edited-day-1")).toBeTruthy();
  });
});
