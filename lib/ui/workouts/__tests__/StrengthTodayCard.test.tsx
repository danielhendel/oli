import React from "react";
import { StyleSheet } from "react-native";
import renderer, { act } from "react-test-renderer";

import type { DayKey } from "@/lib/ui/calendar/types";
import {
  STRENGTH_TODAY_DETAIL_METRIC_LABELS,
  STRENGTH_TODAY_DETAIL_MISSING_VALUE,
  type StrengthTodayDetailVm,
} from "@/lib/data/workouts/strengthTodayDetailVm";

import {
  StrengthTodayCard,
  type StrengthTodayMuscleGroupSelection,
} from "../StrengthTodayCard";

const TODAY = "2026-03-12" as DayKey;

function completedVm(overrides?: Partial<Extract<StrengthTodayDetailVm, { status: "completed" }>>): StrengthTodayDetailVm {
  return {
    status: "completed",
    pill: "Completed",
    hero: "Pull Day",
    subtitleLine: "17 sets · Back focused",
    rows: [
      { id: "duration", label: STRENGTH_TODAY_DETAIL_METRIC_LABELS.duration, value: "57 min" },
      { id: "totalVolume", label: STRENGTH_TODAY_DETAIL_METRIC_LABELS.totalVolume, value: "17 sets" },
      {
        id: "estimatedCalorieBurn",
        label: STRENGTH_TODAY_DETAIL_METRIC_LABELS.estimatedCalorieBurn,
        value: "+252\u2013432 kcal",
      },
      {
        id: "avgHeartRate",
        label: STRENGTH_TODAY_DETAIL_METRIC_LABELS.avgHeartRate,
        value: "98 bpm",
        tappable: true,
      },
    ],
    muscleVolume: {
      rows: [
        { muscleGroup: "back", setCount: 11 },
        { muscleGroup: "biceps", setCount: 6 },
      ],
      exercisesByMuscleGroup: {
        back: [
          { exerciseName: "Pull Up", setCount: 6 },
          { exerciseName: "Barbell Row", setCount: 5 },
        ],
        biceps: [{ exerciseName: "Hammer Curl", setCount: 6 }],
      },
    },
    energyDay: TODAY,
    ...(overrides ?? {}),
  };
}

const restVm: StrengthTodayDetailVm = {
  status: "rest",
  pill: "Rest",
  hero: "No workout today",
  subtitleLine: "Log a session when you train",
};

describe("StrengthTodayCard — loading / rest", () => {
  it("renders an inline loading state and no metric rows", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayCard loading detailVm={null} />);
    });
    expect(tree!.root.findAllByProps({ testID: "strength-today-metric-rows" })).toHaveLength(0);
    expect(
      tree!.root.findAllByProps({ testID: "strength-today-working-volume-back" }),
    ).toHaveLength(0);
    expect(
      tree!.root.findAllByProps({ testID: "strength-today-working-volume-biceps" }),
    ).toHaveLength(0);
    const card = tree!.root.findByProps({ testID: "strength-today-card" });
    expect(card.props.accessibilityLabel).toContain("Loading");
  });

  it("rest state renders rest hero + subtitle and no metric / muscle rows", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayCard loading={false} detailVm={restVm} />);
    });
    const hero = tree!.root.findByProps({ testID: "strength-today-hero" });
    expect(hero.props.children).toBe("No workout today");
    const subtitle = tree!.root.findByProps({ testID: "strength-today-subtitle" });
    expect(subtitle.props.children).toBe("Log a session when you train");
    expect(tree!.root.findAllByProps({ testID: "strength-today-metric-rows" })).toHaveLength(0);
    expect(
      tree!.root.findAllByProps({ testID: "strength-today-working-volume-back" }),
    ).toHaveLength(0);
    expect(
      tree!.root.findAllByProps({ testID: "strength-today-working-volume-biceps" }),
    ).toHaveLength(0);
    const card = tree!.root.findByProps({ testID: "strength-today-card" });
    expect(card.props.accessibilityLabel).toContain("Rest");
  });
});

describe("StrengthTodayCard — completed hero + ordered metric rows", () => {
  it("renders the hero left-aligned with large typography and NO right-side duration figure", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayCard loading={false} detailVm={completedVm()} />);
    });
    const hero = tree!.root.findByProps({ testID: "strength-today-hero" });
    expect(hero.props.children).toBe("Pull Day");
    expect(hero.props.accessibilityRole).toBe("header");
    const style = hero.props.style;
    expect(style).toEqual(
      expect.objectContaining({
        fontSize: 34,
        lineHeight: 40,
        fontWeight: "700",
        letterSpacing: -0.2,
      }),
    );
    // The legacy right-side duration figure is removed. Assertions:
    // (a) No legacy test ID exists for the right-side hero figure.
    expect(tree!.root.findAllByProps({ testID: "strength-today-duration-figure" })).toHaveLength(0);
    // (b) Exactly one visible Text node renders "57 min" — inside the Duration metric row.
    const visibleDurationNodes = tree!.root
      .findAllByType("Text" as never)
      .filter((n) => typeof n.props.children === "string" && n.props.children === "57 min");
    expect(visibleDurationNodes).toHaveLength(1);
    // (c) The hero Text does not render the duration digits (it renders the workout name only).
    expect(hero.props.children).not.toContain("57 min");
  });

  it("renders metric rows in the exact approved order, with correct labels and values", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayCard loading={false} detailVm={completedVm()} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    const iRowsBlock = json.indexOf("strength-today-metric-rows");
    const iDurRow = json.indexOf("strength-today-metric-row-duration");
    const iVolRow = json.indexOf("strength-today-metric-row-totalVolume");
    const iCalRow = json.indexOf("strength-today-metric-row-estimatedCalorieBurn");
    const iHrRow = json.indexOf("strength-today-metric-row-avgHeartRate");
    expect(iRowsBlock).toBeGreaterThan(-1);
    expect(iDurRow).toBeGreaterThan(iRowsBlock);
    expect(iVolRow).toBeGreaterThan(iDurRow);
    expect(iCalRow).toBeGreaterThan(iVolRow);
    expect(iHrRow).toBeGreaterThan(iCalRow);
    expect(json).toContain("Duration");
    expect(json).toContain("Total Volume");
    expect(json).toContain("Estimated Calorie Burn");
    expect(json).toContain("Avg heart rate");
    expect(json).toContain("57 min");
    expect(json).toContain("17 sets");
    expect(json).toContain("+252\u2013432 kcal");
    expect(json).toContain("98 bpm");
  });

  it("renders the subtitle line when present and omits it when null", async () => {
    let withSub!: renderer.ReactTestRenderer;
    let noSub!: renderer.ReactTestRenderer;
    await act(async () => {
      withSub = renderer.create(<StrengthTodayCard loading={false} detailVm={completedVm()} />);
    });
    await act(async () => {
      noSub = renderer.create(
        <StrengthTodayCard
          loading={false}
          detailVm={completedVm({ subtitleLine: null })}
        />,
      );
    });
    expect(
      withSub!.root.findByProps({ testID: "strength-today-subtitle" }).props.children,
    ).toBe("17 sets · Back focused");
    expect(noSub!.root.findAllByProps({ testID: "strength-today-subtitle" })).toHaveLength(0);
  });

  it('renders "—" gracefully for missing calorie burn and avg HR (never invented)', async () => {
    const vm = completedVm({
      rows: [
        { id: "duration", label: STRENGTH_TODAY_DETAIL_METRIC_LABELS.duration, value: "57 min" },
        { id: "totalVolume", label: STRENGTH_TODAY_DETAIL_METRIC_LABELS.totalVolume, value: "17 sets" },
        {
          id: "estimatedCalorieBurn",
          label: STRENGTH_TODAY_DETAIL_METRIC_LABELS.estimatedCalorieBurn,
          value: STRENGTH_TODAY_DETAIL_MISSING_VALUE,
        },
        {
          id: "avgHeartRate",
          label: STRENGTH_TODAY_DETAIL_METRIC_LABELS.avgHeartRate,
          value: STRENGTH_TODAY_DETAIL_MISSING_VALUE,
          tappable: true,
        },
      ],
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayCard loading={false} detailVm={vm} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    // The em-dash appears at least twice in the rendered tree (one per missing row).
    const occurrences = json.split(STRENGTH_TODAY_DETAIL_MISSING_VALUE).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
    // And the digit values from the populated rows are still present.
    expect(json).toContain("57 min");
    expect(json).toContain("17 sets");
  });
});

describe("StrengthTodayCard — Avg HR chevron + press", () => {
  it("Avg HR row has a chevron and the other rows do not", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayCard loading={false} detailVm={completedVm()} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain("strength-today-metric-row-avgHeartRate-chevron");
    expect(json).not.toContain("strength-today-metric-row-duration-chevron");
    expect(json).not.toContain("strength-today-metric-row-totalVolume-chevron");
    expect(json).not.toContain("strength-today-metric-row-estimatedCalorieBurn-chevron");
    // Chevron glyph appears exactly once across the metric rows block (no muscleVolume in this VM
    // ensures only the Avg HR row contributes a chevron to the full tree).
    const noMuscleVolume = completedVm({ muscleVolume: null });
    let isolated!: renderer.ReactTestRenderer;
    await act(async () => {
      isolated = renderer.create(<StrengthTodayCard loading={false} detailVm={noMuscleVolume} />);
    });
    const fullJson = JSON.stringify(isolated!.toJSON());
    expect(fullJson.split("\u203A").length - 1).toBe(1);
  });

  it("Avg HR row fires onPressAvgHeartRate(day) when pressed", async () => {
    const onPressAvgHeartRate = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthTodayCard
          loading={false}
          detailVm={completedVm()}
          onPressAvgHeartRate={onPressAvgHeartRate}
        />,
      );
    });
    const row = tree!.root.findByProps({ testID: "strength-today-metric-row-avgHeartRate" });
    expect(row.props.accessibilityRole).toBe("button");
    expect(row.props.accessibilityLabel).toContain("Avg heart rate");
    expect(row.props.accessibilityLabel).toContain("98 bpm");
    expect(row.props.disabled).toBe(false);
    await act(async () => {
      row.props.onPress();
    });
    expect(onPressAvgHeartRate).toHaveBeenCalledTimes(1);
    expect(onPressAvgHeartRate).toHaveBeenCalledWith(TODAY);
  });

  it("Avg HR row is disabled when no onPressAvgHeartRate is provided", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayCard loading={false} detailVm={completedVm()} />);
    });
    const row = tree!.root.findByProps({ testID: "strength-today-metric-row-avgHeartRate" });
    expect(row.props.disabled).toBe(true);
    expect(row.props.accessibilityState).toEqual({ disabled: true });
  });
});

describe("StrengthTodayCard — preserved volume-by-muscle-group rows (inline between Total Volume and Estimated Calorie Burn)", () => {
  it("renders muscle rows inline between Total Volume and Estimated Calorie Burn", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayCard loading={false} detailVm={completedVm()} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    const iMetricRows = json.indexOf("strength-today-metric-rows");
    const iDurRow = json.indexOf("strength-today-metric-row-duration");
    const iVolRow = json.indexOf("strength-today-metric-row-totalVolume");
    const iBack = json.indexOf("strength-today-working-volume-back");
    const iBiceps = json.indexOf("strength-today-working-volume-biceps");
    const iCalRow = json.indexOf("strength-today-metric-row-estimatedCalorieBurn");
    const iHrRow = json.indexOf("strength-today-metric-row-avgHeartRate");
    expect(iMetricRows).toBeGreaterThan(-1);
    expect(iDurRow).toBeGreaterThan(iMetricRows);
    expect(iVolRow).toBeGreaterThan(iDurRow);
    expect(iBack).toBeGreaterThan(iVolRow);
    expect(iBiceps).toBeGreaterThan(iBack);
    expect(iCalRow).toBeGreaterThan(iBiceps);
    expect(iHrRow).toBeGreaterThan(iCalRow);
  });

  it("muscle rows live INSIDE the single strength-today-metric-rows block (no separate working-volume parent)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayCard loading={false} detailVm={completedVm()} />);
    });
    expect(
      tree!.root.findAllByProps({ testID: "strength-today-working-volume" }),
    ).toHaveLength(0);
    const metricRows = tree!.root.findByProps({ testID: "strength-today-metric-rows" });
    const back = metricRows.findByProps({ testID: "strength-today-working-volume-back" });
    const biceps = metricRows.findByProps({ testID: "strength-today-working-volume-biceps" });
    expect(back).toBeDefined();
    expect(biceps).toBeDefined();
  });

  it("muscle rows preserve full-row press → onSelectMuscleGroup contract", async () => {
    const onSelectMuscleGroup = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthTodayCard
          loading={false}
          detailVm={completedVm()}
          onSelectMuscleGroup={onSelectMuscleGroup}
        />,
      );
    });
    const backRow = tree!.root.findByProps({ testID: "strength-today-working-volume-back" });
    expect(backRow.props.accessibilityRole).toBe("button");
    expect(backRow.props.accessibilityLabel).toContain("Open Back working volume breakdown");
    await act(async () => {
      backRow.props.onPress();
    });
    expect(onSelectMuscleGroup).toHaveBeenCalledTimes(1);
    const selection: StrengthTodayMuscleGroupSelection = onSelectMuscleGroup.mock.calls[0]![0];
    expect(selection.muscleGroup).toBe("back");
    expect(selection.label).toBe("Back");
    expect(selection.totalSetCount).toBe(11);
    expect(selection.exercises).toEqual([
      { exerciseName: "Pull Up", setCount: 6 },
      { exerciseName: "Barbell Row", setCount: 5 },
    ]);

    const bicepsRow = tree!.root.findByProps({ testID: "strength-today-working-volume-biceps" });
    await act(async () => {
      bicepsRow.props.onPress();
    });
    expect(onSelectMuscleGroup).toHaveBeenCalledTimes(2);
    const bicepsSel: StrengthTodayMuscleGroupSelection = onSelectMuscleGroup.mock.calls[1]![0];
    expect(bicepsSel.muscleGroup).toBe("biceps");
    expect(bicepsSel.label).toBe("Biceps");
    expect(bicepsSel.totalSetCount).toBe(6);
    expect(bicepsSel.exercises).toEqual([{ exerciseName: "Hammer Curl", setCount: 6 }]);
  });

  it("muscle rows are absent when muscleVolume is null; metric rows still render", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthTodayCard loading={false} detailVm={completedVm({ muscleVolume: null })} />,
      );
    });
    expect(
      tree!.root.findAllByProps({ testID: "strength-today-working-volume-back" }),
    ).toHaveLength(0);
    expect(
      tree!.root.findAllByProps({ testID: "strength-today-working-volume-biceps" }),
    ).toHaveLength(0);
    expect(tree!.root.findByProps({ testID: "strength-today-metric-rows" })).toBeDefined();
  });

  it("only one hairline divider in the card body: the metric-rows top border. Nothing renders below Avg HR.", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayCard loading={false} detailVm={completedVm()} />);
    });
    const metricRows = tree!.root.findByProps({ testID: "strength-today-metric-rows" });
    const flatStyle = StyleSheet.flatten(metricRows.props.style) as {
      borderTopWidth?: number;
    };
    expect(flatStyle.borderTopWidth).toBe(StyleSheet.hairlineWidth);

    // Count any element in the full tree (inside the card body) whose flattened style has a
    // top hairline border. Should be exactly one: the metric-rows block itself.
    // Filter to host elements only (string `type` like "View"), not component instances,
    // to avoid double-counting the same logical node.
    const hostWithStyle = tree!.root.findAll(
      (n) => typeof n.type === "string" && n.props != null && n.props.style != null,
    );
    const dividerInfos = hostWithStyle
      .map((n) => {
        const raw = n.props.style;
        if (typeof raw === "function") return null;
        const flat = StyleSheet.flatten(raw) as { borderTopWidth?: number } | undefined;
        if (flat == null) return null;
        if (
          typeof flat.borderTopWidth === "number" &&
          flat.borderTopWidth === StyleSheet.hairlineWidth
        ) {
          return { testID: n.props.testID };
        }
        return null;
      })
      .filter((x): x is { testID?: unknown } => x != null);
    // Exactly one hairline divider in the card: the metric-rows block's top border.
    // No second hairline appears anywhere below it (would indicate a divider under Avg HR).
    expect(dividerInfos).toHaveLength(1);
    expect(dividerInfos[0]!.testID).toBe("strength-today-metric-rows");

    // Avg HR row is the last interesting row in the metric-rows block.
    const json = JSON.stringify(tree!.toJSON());
    const positions = [
      json.indexOf("strength-today-metric-row-duration"),
      json.indexOf("strength-today-metric-row-totalVolume"),
      json.indexOf("strength-today-working-volume-back"),
      json.indexOf("strength-today-working-volume-biceps"),
      json.indexOf("strength-today-metric-row-estimatedCalorieBurn"),
      json.indexOf("strength-today-metric-row-avgHeartRate"),
    ];
    const maxIdx = Math.max(...positions);
    expect(maxIdx).toBe(json.indexOf("strength-today-metric-row-avgHeartRate"));
  });
});

describe("StrengthTodayCard — accessibility composition", () => {
  it("root accessibilityLabel mentions Today / pill / hero / each metric row", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayCard loading={false} detailVm={completedVm()} />);
    });
    const card = tree!.root.findByProps({ testID: "strength-today-card" });
    const label = card.props.accessibilityLabel as string;
    expect(label).toContain("Today");
    expect(label).toContain("Completed");
    expect(label).toContain("Pull Day");
    expect(label).toContain("Duration, 57 min");
    expect(label).toContain("Total Volume, 17 sets");
    expect(label).toContain("Estimated Calorie Burn, +252\u2013432 kcal");
    expect(label).toContain("Avg heart rate, 98 bpm");
  });
});
