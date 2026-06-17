/**
 * Nutrition overview cards: Today values, Recent rows/states, no HTTP leakage.
 */
import React from "react";
import renderer, { act } from "react-test-renderer";
import type { NutritionTodayCardModel } from "@/lib/data/nutrition/nutritionTodayCardModel";
import type { NutritionRecentCardModel } from "@/lib/data/nutrition/nutritionRecentCardModel";
import type { NutritionRecentRawUi } from "@/lib/hooks/useNutritionOverviewScreenData";
import { NutritionTodayCard } from "@/lib/ui/nutrition/NutritionTodayCard";
import { NutritionRecentCard } from "@/lib/ui/nutrition/NutritionRecentCard";

function macroRow(
  key: "kcal" | "protein" | "carbs" | "fat",
  label: string,
  current: number,
  target: number,
  unit: string,
): NutritionTodayCardModel["rows"][number] {
  return {
    key,
    label,
    valueLabel: `${current} ${unit}`,
    progress: current / target,
    available: true,
    currentValue: current,
    targetValue: target,
    unit,
    amountLabel: `${current} / ${target} ${unit}`,
    percentLabel: `${Math.round((current / target) * 100)}%`,
  };
}

function todayModel(): NutritionTodayCardModel {
  return {
    rows: [
      macroRow("kcal", "Calories", 500, 2000, "kcal"),
      macroRow("protein", "Protein", 40, 150, "g"),
      macroRow("carbs", "Carbs", 60, 250, "g"),
      macroRow("fat", "Fat", 15, 65, "g"),
    ],
    calorieValueLabel: "500 kcal",
    calorieGoalLabel: "Goal 2,000 kcal",
  };
}

describe("NutritionTodayCard", () => {
  it("renders calorie hero and protein/carbs/fat macro rows", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <NutritionTodayCard
          model={todayModel()}
          todayFacts={{ readiness: "ready", isLoading: false }}
        />,
      );
    });
    const root = tree!.root;
    const hero = root.findByProps({ testID: "nutrition-today-calorie-value" });
    expect(hero.props.children).toBe("500 kcal");
    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain("Goal 2,000 kcal");
    expect(flat).toContain("Protein");
    expect(flat).toContain("40 / 150 g");
    expect(flat).toContain("Carbs");
    expect(flat).toContain("Fat");
  });

  it("exposes progress bar test hooks per macro row", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <NutritionTodayCard
          model={todayModel()}
          todayFacts={{ readiness: "ready", isLoading: false }}
        />,
      );
    });
    const root = tree!.root;
    expect(() => root.findByProps({ testID: "nutrition-today-progress-protein" })).not.toThrow();
    expect(() => root.findByProps({ testID: "nutrition-today-progress-fat" })).not.toThrow();
  });

  it("renders chevrons and navigates per macro when onPressMacro is provided", async () => {
    const onPressMacro = jest.fn();
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <NutritionTodayCard
          model={todayModel()}
          todayFacts={{ readiness: "ready", isLoading: false }}
          onPressMacro={onPressMacro}
        />,
      );
    });
    const root = tree!.root;
    expect(() => root.findByProps({ testID: "nutrition-today-macro-protein-chevron" })).not.toThrow();
    await act(async () => {
      root.findByProps({ testID: "nutrition-today-macro-carbs" }).props.onPress();
    });
    expect(onPressMacro).toHaveBeenCalledWith("carbs");
  });

  it("hides chevrons when not navigable (static summary)", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <NutritionTodayCard
          model={todayModel()}
          todayFacts={{ readiness: "ready", isLoading: false }}
        />,
      );
    });
    const root = tree!.root;
    expect(() => root.findByProps({ testID: "nutrition-today-macro-protein-chevron" })).toThrow();
  });
});

describe("NutritionRecentCard", () => {
  const noop = jest.fn();

  it("renders logged food title when rows exist", async () => {
    const model: NutritionRecentCardModel = {
      rows: [
        {
          id: "e1",
          title: "Chicken breast grilled",
          subtitle: "Lunch · 12:30 PM",
          kcalLabel: "250 kcal",
        },
      ],
    };
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <NutritionRecentCard
          model={model}
          recentRaw={{ readiness: "ready", isLoading: false }}
          hasDayRollup
          dayKey="2026-03-12"
          onViewMore={noop}
          onEntryPress={noop}
        />,
      );
    });
    expect(JSON.stringify(tree!.toJSON())).toContain("Chicken breast grilled");
  });

  it("shows syncing copy when rollup exists but no rows yet", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <NutritionRecentCard
          model={{ rows: [] }}
          recentRaw={{ readiness: "ready", isLoading: false }}
          hasDayRollup
          dayKey="2026-03-12"
          onViewMore={noop}
          onEntryPress={noop}
        />,
      );
    });
    const root = tree!.root;
    expect(() => root.findByProps({ testID: "nutrition-recent-syncing" })).not.toThrow();
    expect(JSON.stringify(tree!.toJSON())).toContain("Meal list syncing");
  });

  it("shows empty copy only when no rollup and no rows", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <NutritionRecentCard
          model={{ rows: [] }}
          recentRaw={{ readiness: "ready", isLoading: false }}
          hasDayRollup={false}
          dayKey="2026-03-12"
          onViewMore={noop}
          onEntryPress={noop}
        />,
      );
    });
    const root = tree!.root;
    expect(() => root.findByProps({ testID: "nutrition-recent-empty" })).not.toThrow();
    expect(JSON.stringify(tree!.toJSON())).toContain("No meals logged yet");
  });

  it("does not surface raw HTTP status text when raw read fails", async () => {
    const recentRaw: NutritionRecentRawUi = { readiness: "error", isLoading: false };
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <NutritionRecentCard
          model={{ rows: [] }}
          recentRaw={recentRaw}
          hasDayRollup={false}
          dayKey="2026-03-12"
          onViewMore={noop}
          onEntryPress={noop}
        />,
      );
    });
    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).not.toMatch(/HTTP\s*\d{3}|status\s*[:=]\s*(400|404)/i);
    expect(flat).toContain("No meals logged yet");
  });

  it("shows syncing when rollup exists even if raw fetch errored", async () => {
    const recentRaw: NutritionRecentRawUi = { readiness: "error", isLoading: false };
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <NutritionRecentCard
          model={{ rows: [] }}
          recentRaw={recentRaw}
          hasDayRollup
          dayKey="2026-03-12"
          onViewMore={noop}
          onEntryPress={noop}
        />,
      );
    });
    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain("Meal list syncing");
    expect(flat).not.toMatch(/HTTP\s*\d{3}|status\s*[:=]\s*(400|404)/i);
  });
});
