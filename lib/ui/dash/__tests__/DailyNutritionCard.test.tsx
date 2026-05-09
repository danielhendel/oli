import React from "react";
import renderer, { act } from "react-test-renderer";

import { DailyNutritionCard } from "@/lib/ui/dash/DailyNutritionCard";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

describe("DailyNutritionCard", () => {
  const readyModel = {
    calorieLabel: "1,850 kcal",
    hasAnyNutrition: true,
    rows: [
      { key: "protein", label: "Protein", valueLabel: "142 g" },
      { key: "carbs", label: "Carbs", valueLabel: "210 g" },
      { key: "fat", label: "Fat", valueLabel: "64 g" },
    ] as const,
  };

  function renderText(tree: renderer.ReactTestRenderer): string {
    return tree.root
      .findAllByType("Text")
      .flatMap((n) => n.children)
      .filter((c) => typeof c === "string")
      .join(" ");
  }

  it("renders kcal and macros when data exists", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DailyNutritionCard model={readyModel} loading={false} error={null} />);
    });
    const text = renderText(tree);
    expect(text).toContain("Daily Nutrition");
    expect(text).toContain("1,850 kcal");
    expect(text).toContain("Logged today");
    expect(text).toContain("Protein");
    expect(text).toContain("142 g");
    expect(text).toContain("Carbs");
    expect(text).toContain("210 g");
    expect(text).toContain("Fat");
    expect(text).toContain("64 g");
  });

  it("renders missing state with em-dash rows", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <DailyNutritionCard
          model={{
            calorieLabel: "—",
            hasAnyNutrition: false,
            rows: [
              { key: "protein", label: "Protein", valueLabel: "—" },
              { key: "carbs", label: "Carbs", valueLabel: "—" },
              { key: "fat", label: "Fat", valueLabel: "—" },
            ] as const,
          }}
          loading={false}
          error={null}
        />,
      );
    });
    const text = renderText(tree);
    expect(text).toContain("No nutrition logged today");
    expect(text).not.toContain("Logged today");
    expect(text).toContain("Protein");
    expect(text).toContain("Carbs");
    expect(text).toContain("Fat");
  });

  it("renders loading state", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DailyNutritionCard model={readyModel} loading error={null} />);
    });
    expect(renderText(tree)).toContain("Loading daily nutrition");
  });
});
