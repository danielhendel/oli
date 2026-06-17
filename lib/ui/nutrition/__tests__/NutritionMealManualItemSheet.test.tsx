import React from "react";
import renderer, { act } from "react-test-renderer";
import { NutritionMealManualItemSheet } from "@/lib/ui/nutrition/NutritionMealManualItemSheet";

describe("NutritionMealManualItemSheet", () => {
  it("calls onAdd with parsed label + macros", async () => {
    const onAdd = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <NutritionMealManualItemSheet visible onAdd={onAdd} onClose={jest.fn()} />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      tree.root.findByProps({ testID: "manual-item-label" }).props.onChangeText("Shake");
      tree.root.findByProps({ testID: "manual-item-calories" }).props.onChangeText("200");
      tree.root.findByProps({ testID: "manual-item-protein" }).props.onChangeText("40");
      await Promise.resolve();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "manual-item-add" }).props.onPress();
      await Promise.resolve();
    });

    expect(onAdd).toHaveBeenCalledWith({
      label: "Shake",
      macros: { caloriesKcal: 200, proteinG: 40, carbsG: 0, fatG: 0, fiberG: 0 },
    });

    act(() => tree.unmount());
  });
});
