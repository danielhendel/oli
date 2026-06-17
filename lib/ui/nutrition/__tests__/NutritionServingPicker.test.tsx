import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { NutritionServingPicker } from "@/lib/ui/nutrition/NutritionServingPicker";
import { defaultServingOption } from "@/lib/nutrition/servingSelection";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import { Text } from "react-native";

function flatStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  return Array.isArray(style) ? Object.assign({}, ...style) : (style as Record<string, unknown>);
}

const eggs: NutritionFoodSearchItemDto = {
  id: "oli:fg:eggs",
  name: "Eggs",
  servingLabel: "1 large egg",
  caloriesKcal: 71.5,
  proteinG: 6.3,
  carbsG: 0.35,
  fatG: 4.75,
  basis: "mass",
  per100g: { caloriesKcal: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5 },
  servings: [{ id: "egg", label: "1 large egg", grams: 50, unit: "piece", isDefault: true }],
};

const legacyBar: NutritionFoodSearchItemDto = {
  id: "dev:bar",
  name: "Protein bar",
  servingLabel: "1 bar",
  caloriesKcal: 200,
  proteinG: 20,
  carbsG: 22,
  fatG: 7,
};

function renderPicker(food: NutritionFoodSearchItemDto, quantityText: string): string {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <NutritionServingPicker
        food={food}
        selectedOptionKey={defaultServingOption(food).key}
        quantityText={quantityText}
        onSelectOption={jest.fn()}
        onChangeQuantity={jest.fn()}
      />,
    );
  });
  return JSON.stringify(tree!.toJSON());
}

describe("NutritionServingPicker", () => {
  it("shows live nutrition + grams for 3 eggs", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <NutritionServingPicker
          food={eggs}
          selectedOptionKey={defaultServingOption(eggs).key}
          quantityText="3"
          onSelectOption={jest.fn()}
          onChangeQuantity={jest.fn()}
        />,
      );
    });
    const grams = tree!.root.findByProps({ testID: "serving-grams" });
    expect(grams.props.children.join("")).toBe("150 g");
    const summary = tree!.root.findByProps({ testID: "serving-nutrition-summary" });
    expect(summary.props.accessibilityLabel).toContain("215 calories");
  });

  it("recomputes when quantity changes (1 egg)", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <NutritionServingPicker
          food={eggs}
          selectedOptionKey={defaultServingOption(eggs).key}
          quantityText="1"
          onSelectOption={jest.fn()}
          onChangeQuantity={jest.fn()}
        />,
      );
    });
    const grams = tree!.root.findByProps({ testID: "serving-grams" });
    expect(grams.props.children.join("")).toBe("50 g");
    const summary = tree!.root.findByProps({ testID: "serving-nutrition-summary" });
    expect(summary.props.accessibilityLabel).toContain("72 calories");
  });

  it("exposes a polite live region with a spoken nutrition summary", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <NutritionServingPicker
          food={eggs}
          selectedOptionKey={defaultServingOption(eggs).key}
          quantityText="3"
          onSelectOption={jest.fn()}
          onChangeQuantity={jest.fn()}
        />,
      );
    });
    const summary = tree!.root.findByProps({ testID: "serving-nutrition-summary" });
    expect(summary.props.accessibilityLiveRegion).toBe("polite");
    expect(summary.props.accessibilityLabel).toContain("215 calories");
  });

  it("falls back to the serving label for legacy foods", () => {
    const flat = renderPicker(legacyBar, "2");
    expect(flat).toContain("1 bar");
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <NutritionServingPicker
          food={legacyBar}
          selectedOptionKey={defaultServingOption(legacyBar).key}
          quantityText="2"
          onSelectOption={jest.fn()}
          onChangeQuantity={jest.fn()}
        />,
      );
    });
    const summary = tree!.root.findByProps({ testID: "serving-nutrition-summary" });
    expect(summary.props.accessibilityLabel).toContain("400 calories");
  });

  it("uses dark-theme readable colors for macro summary text", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <NutritionServingPicker
          food={eggs}
          selectedOptionKey={defaultServingOption(eggs).key}
          quantityText="1"
          onSelectOption={jest.fn()}
          onChangeQuantity={jest.fn()}
        />,
      );
    });
    const summary = tree!.root.findByProps({ testID: "serving-nutrition-summary" });
    const summaryText = summary.findByType(Text);
    expect(flatStyle(summaryText.props.style).color).toBe("#F7F8FA");
  });
});
