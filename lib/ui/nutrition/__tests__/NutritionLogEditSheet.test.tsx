import React from "react";
import renderer, { act } from "react-test-renderer";
import type { NutritionDayMealEntry } from "@/lib/data/nutrition/nutritionDayMealEntries";
import { formatTimeOfDay } from "@/lib/nutrition/editNutritionLog";

jest.mock("@/lib/ui/nutrition/NutritionTimeWheelPicker", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");
  return {
    NutritionTimeWheelPicker: ({
      testID = "nutrition-time-wheel",
      onChange,
    }: {
      testID?: string;
      onChange: (v: { hour12: number; minute: number; meridiem: "AM" | "PM" }) => void;
    }) => (
      <View testID={testID}>
        <View testID={`${testID}-hour`} />
        <View testID={`${testID}-minute`} />
        <View testID={`${testID}-meridiem`} />
        <Pressable
          testID={`${testID}-apply-905pm`}
          onPress={() => onChange({ hour12: 9, minute: 5, meridiem: "PM" })}
        />
      </View>
    ),
  };
});

import { NutritionLogEditSheet } from "@/lib/ui/nutrition/NutritionLogEditSheet";

const entry: NutritionDayMealEntry = {
  id: "evt-1",
  title: "Jasmine Rice",
  mealLabel: "Meal 3",
  timeLabel: "2:22 PM",
  subtitle: "Meal 3 · 2:22 PM",
  kcalLabel: "220 kcal",
  observedAt: "2026-03-15T18:22:00.000Z",
  mealSlot: "dinner",
  editable: true,
  payload: {
    start: "2026-03-15T18:22:00.000Z",
    end: "2026-03-15T18:22:01.000Z",
    timezone: "UTC",
    day: "2026-03-15",
    totalKcal: 220,
    proteinG: 5,
    carbsG: 43,
    fatG: 2.5,
    logScope: "meal",
    foodLabel: "Jasmine Rice",
    mealSlot: "dinner",
  },
};

function renderSheet(overrides: Partial<React.ComponentProps<typeof NutritionLogEditSheet>> = {}) {
  const onSave = jest.fn();
  const onClose = jest.fn();
  const onDelete = jest.fn();
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <NutritionLogEditSheet
        visible
        entry={entry}
        dayKey="2026-03-15"
        status="idle"
        errorMessage={null}
        onClose={onClose}
        onSave={onSave}
        onDelete={onDelete}
        {...overrides}
      />,
    );
  });
  return { tree, onSave, onClose, onDelete };
}

function press(tree: renderer.ReactTestRenderer, testID: string) {
  act(() => {
    tree.root.findByProps({ testID }).props.onPress?.();
  });
}

describe("NutritionLogEditSheet", () => {
  it("renders Meal 1–6 labels instead of Breakfast/Lunch/Dinner/Snack", () => {
    const { tree } = renderSheet();
    expect(tree.root.findByProps({ testID: "edit-meal-slot-meal1" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "edit-meal-slot-meal3" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "edit-meal-slot-meal6" })).toBeTruthy();
    const flat = JSON.stringify(tree.toJSON());
    expect(flat).not.toContain("Breakfast");
    expect(flat).not.toContain("Lunch");
    expect(flat).toContain("Meal 3");
    act(() => tree.unmount());
  });

  it("selects Meal 3 for a legacy dinner log", () => {
    const { tree } = renderSheet();
    const meal3 = tree.root.findByProps({ testID: "edit-meal-slot-meal3" });
    expect(meal3.props.accessibilityState?.selected).toBe(true);
    act(() => tree.unmount());
  });

  it("opens the time wheel picker when the time button is tapped", () => {
    const { tree } = renderSheet();
    expect(() => tree.root.findByProps({ testID: "edit-meal-time-picker" })).toThrow();
    press(tree, "edit-meal-time-button");
    expect(tree.root.findByProps({ testID: "edit-meal-time-picker" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "nutrition-time-wheel-hour" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "nutrition-time-wheel-minute" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "nutrition-time-wheel-meridiem" })).toBeTruthy();
    act(() => tree.unmount());
  });

  it("cancel on the time picker closes without saving", () => {
    const { tree, onSave } = renderSheet();
    const timeBefore = tree.root.findByProps({ testID: "edit-meal-time-button" }).props
      .accessibilityLabel as string;
    press(tree, "edit-meal-time-button");
    press(tree, "nutrition-time-wheel-apply-905pm");
    press(tree, "edit-meal-time-cancel");
    expect(() => tree.root.findByProps({ testID: "edit-meal-time-picker" })).toThrow();
    expect(tree.root.findByProps({ testID: "edit-meal-time-button" }).props.accessibilityLabel).toBe(
      timeBefore,
    );
    press(tree, "edit-meal-save");
    expect(onSave).toHaveBeenCalledTimes(1);
    const { observedAtIso } = onSave.mock.calls[0]![0] as { observedAtIso: string };
    const d = new Date(observedAtIso);
    expect(formatTimeOfDay(d.getHours(), d.getMinutes())).not.toBe("9:05 PM");
    act(() => tree.unmount());
  });

  it("saves Meal 3 via parent callback", () => {
    const { tree, onSave } = renderSheet();
    press(tree, "edit-meal-save");
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        mealSlot: "meal3",
        observedAtIso: expect.any(String),
      }),
    );
    act(() => tree.unmount());
  });

  it("saves 9:05 PM after confirming the wheel picker", () => {
    const { tree, onSave } = renderSheet();
    press(tree, "edit-meal-time-button");
    press(tree, "nutrition-time-wheel-apply-905pm");
    press(tree, "edit-meal-time-done");
    press(tree, "edit-meal-save");
    const { observedAtIso } = onSave.mock.calls[0]![0] as { observedAtIso: string };
    const d = new Date(observedAtIso);
    expect(formatTimeOfDay(d.getHours(), d.getMinutes())).toBe("9:05 PM");
    act(() => tree.unmount());
  });
});
