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

function todayModel(): NutritionTodayCardModel {
  return {
    rows: [
      {
        key: "kcal",
        label: "Calories",
        valueLabel: "500 kcal",
        progress: 0.25,
        available: true,
      },
      {
        key: "protein",
        label: "Protein",
        valueLabel: "40 g",
        progress: 0.27,
        available: true,
      },
      {
        key: "carbs",
        label: "Carbs",
        valueLabel: "60 g",
        progress: 0.24,
        available: true,
      },
      {
        key: "fat",
        label: "Fat",
        valueLabel: "15 g",
        progress: 0.23,
        available: true,
      },
    ],
  };
}

describe("NutritionTodayCard", () => {
  it("renders calorie/protein/carbs/fat labels from the model", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <NutritionTodayCard
          model={todayModel()}
          todayFacts={{ readiness: "ready", isLoading: false }}
        />,
      );
    });
    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain("500");
    expect(flat).toContain("Calories");
    expect(flat).toContain("40");
    expect(flat).toContain("Protein");
    expect(flat).toContain("60");
    expect(flat).toContain("Carbs");
    expect(flat).toContain("15");
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
    expect(() => root.findByProps({ testID: "nutrition-today-progress-kcal" })).not.toThrow();
    expect(() => root.findByProps({ testID: "nutrition-today-progress-protein" })).not.toThrow();
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
