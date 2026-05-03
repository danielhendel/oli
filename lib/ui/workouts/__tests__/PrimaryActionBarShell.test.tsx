import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, Text } from "react-native";

import { PRIMARY_ACTION_BAR_SHELL_HEIGHT } from "@/lib/ui/workouts/programPrimaryCtaBarStyles";
import { PrimaryActionBarShell } from "@/lib/ui/workouts/PrimaryActionBarShell";

describe("PrimaryActionBarShell", () => {
  it("applies the same primary container metrics for center (Create Program) and row (This Week) layouts", () => {
    let centerTree!: renderer.ReactTestRenderer;
    let rowTree!: renderer.ReactTestRenderer;
    act(() => {
      centerTree = renderer.create(
        <PrimaryActionBarShell layout="center">
          <Text>Label</Text>
        </PrimaryActionBarShell>,
      );
      rowTree = renderer.create(
        <PrimaryActionBarShell layout="row">
          <Text>Left</Text>
        </PrimaryActionBarShell>,
      );
    });
    const center = StyleSheet.flatten(centerTree.root.findByType("View").props.style);
    const row = StyleSheet.flatten(rowTree.root.findByType("View").props.style);
    expect(row.height).toBe(center.height);
    expect(row.height).toBe(PRIMARY_ACTION_BAR_SHELL_HEIGHT);
    expect(row.paddingVertical).toBe(center.paddingVertical);
    expect(row.paddingHorizontal).toBe(center.paddingHorizontal);
    expect(row.borderRadius).toBe(center.borderRadius);
    expect(row.backgroundColor).toBe(center.backgroundColor);
    expect(center.justifyContent).toBe("center");
    expect(row.flexDirection).toBe("row");
    expect(row.alignItems).toBe("center");
  });
});
