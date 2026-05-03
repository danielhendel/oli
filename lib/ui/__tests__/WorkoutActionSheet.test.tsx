import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet } from "react-native";
import { WorkoutActionSheet } from "@/lib/ui/WorkoutActionSheet";
import { UI_PANEL_SURFACE } from "@/lib/ui/theme/uiTokens";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const anchor = { x: 300, y: 120, width: 28, height: 28 };

describe("WorkoutActionSheet", () => {
  const base = {
    visible: true,
    anchor,
    onClose: jest.fn(),
    onViewDetails: jest.fn(),
    onDoItAgain: jest.fn(),
    onRename: jest.fn(),
    onEditDuration: jest.fn(),
    onEditType: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function mountSheet(extra: Partial<React.ComponentProps<typeof WorkoutActionSheet>> = {}) {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(
        <WorkoutActionSheet
          {...base}
          onDeleteWorkout={jest.fn()}
          {...extra}
        />,
      );
      await Promise.resolve();
    });
    return test;
  }

  it("renders panel with Manage-matching dark surface token", async () => {
    const test = await mountSheet();
    const panel = test.root.findByProps({ testID: "oli-workout-action-menu" });
    const flat = StyleSheet.flatten(panel.props.style);
    expect(flat.backgroundColor).toBe(UI_PANEL_SURFACE);
  });

  it("renders primary actions in canonical order (no edit exercises)", async () => {
    const test = await mountSheet();
    const testIDs = [
      "workout-action-view-details",
      "workout-action-do-it-again",
      "workout-action-rename",
      "workout-action-edit-duration",
      "workout-action-edit-type",
      "workout-action-delete",
      "workout-action-cancel",
    ];
    const labels = [
      "View details",
      "Do it again",
      "Rename workout",
      "Edit duration",
      "Edit workout type",
      "Delete workout",
      "Cancel",
    ];
    testIDs.forEach((id, i) => {
      const node = test.root.findByProps({ testID: id });
      expect(node.props.accessibilityLabel).toBe(labels[i]);
    });
  });

  it("inserts Edit exercises after Do it again when provided", async () => {
    const test = await mountSheet({
      onEditExercises: jest.fn(),
    });
    const testIDs = [
      "workout-action-view-details",
      "workout-action-do-it-again",
      "workout-action-edit-exercises",
      "workout-action-rename",
      "workout-action-edit-duration",
      "workout-action-edit-type",
      "workout-action-delete",
      "workout-action-cancel",
    ];
    const labels = [
      "View details",
      "Do it again",
      "Edit exercises",
      "Rename workout",
      "Edit duration",
      "Edit workout type",
      "Delete workout",
      "Cancel",
    ];
    testIDs.forEach((id, i) => {
      const node = test.root.findByProps({ testID: id });
      expect(node.props.accessibilityLabel).toBe(labels[i]);
    });
  });

  it("uses destructive red styling for delete row label", async () => {
    const test = await mountSheet();
    const deleteBtn = test.root.findByProps({ accessibilityLabel: "Delete workout" });
    const texts = collectTextNodes(deleteBtn);
    const label = texts.find((t) => t.props.children === "Delete Workout");
    expect(label).toBeTruthy();
    const color = StyleSheet.flatten(label!.props.style).color;
    expect(color).toBe("#FF3B30");
  });

  it("closes when dim overlay is pressed", async () => {
    const onClose = jest.fn();
    const test = await mountSheet({ onClose });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Close workout actions" }).props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when Cancel is pressed", async () => {
    const onClose = jest.fn();
    const test = await mountSheet({ onClose });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Cancel" }).props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("invokes each action callback without calling onClose for primary rows", async () => {
    const onClose = jest.fn();
    const handlers = {
      onViewDetails: jest.fn(),
      onDoItAgain: jest.fn(),
      onRename: jest.fn(),
      onEditDuration: jest.fn(),
      onEditType: jest.fn(),
      onDeleteWorkout: jest.fn(),
    };
    const test = await mountSheet({ onClose, ...handlers });

    act(() => test.root.findByProps({ accessibilityLabel: "View details" }).props.onPress());
    act(() => test.root.findByProps({ accessibilityLabel: "Do it again" }).props.onPress());
    act(() => test.root.findByProps({ accessibilityLabel: "Rename workout" }).props.onPress());
    act(() => test.root.findByProps({ accessibilityLabel: "Edit duration" }).props.onPress());
    act(() => test.root.findByProps({ accessibilityLabel: "Edit workout type" }).props.onPress());
    act(() => test.root.findByProps({ accessibilityLabel: "Delete workout" }).props.onPress());

    expect(handlers.onViewDetails).toHaveBeenCalledTimes(1);
    expect(handlers.onDoItAgain).toHaveBeenCalledTimes(1);
    expect(handlers.onRename).toHaveBeenCalledTimes(1);
    expect(handlers.onEditDuration).toHaveBeenCalledTimes(1);
    expect(handlers.onEditType).toHaveBeenCalledTimes(1);
    expect(handlers.onDeleteWorkout).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("invokes onEditExercises when that row is pressed", async () => {
    const onEditExercises = jest.fn();
    const test = await mountSheet({ onEditExercises });
    act(() => {
      test.root.findByProps({ accessibilityLabel: "Edit exercises" }).props.onPress();
    });
    expect(onEditExercises).toHaveBeenCalledTimes(1);
  });
});

function collectTextNodes(node: renderer.ReactTestInstance): renderer.ReactTestInstance[] {
  if (node.type === "Text") return [node];
  const ch = node.children ?? [];
  return ch.flatMap((c) => (typeof c === "string" ? [] : collectTextNodes(c as renderer.ReactTestInstance)));
}
