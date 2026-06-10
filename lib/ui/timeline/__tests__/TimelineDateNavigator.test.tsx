// lib/ui/timeline/__tests__/TimelineDateNavigator.test.tsx
import React from "react";
import renderer, { act } from "react-test-renderer";
import { Pressable } from "react-native";

import { TimelineDateNavigator } from "@/lib/ui/timeline/TimelineDateNavigator";

function pressByLabel(tree: renderer.ReactTestRenderer, label: string) {
  const pressables = tree.root.findAllByType(Pressable);
  const target = pressables.find(
    (p) => (p.props as { accessibilityLabel?: string }).accessibilityLabel === label,
  );
  if (!target) throw new Error(`no pressable with label ${label}`);
  act(() => {
    (target.props as { onPress: () => void }).onPress();
  });
}

describe("TimelineDateNavigator", () => {
  it("invokes prev / next / today callbacks", () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    const onToday = jest.fn();

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <TimelineDateNavigator
          day="2026-06-09"
          isToday={false}
          onPrev={onPrev}
          onNext={onNext}
          onToday={onToday}
        />,
      );
    });

    pressByLabel(tree, "Previous day");
    pressByLabel(tree, "Next day");
    pressByLabel(tree, "Jump to today");

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onToday).toHaveBeenCalledTimes(1);
  });

  it("hides the Today shortcut when already on today", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <TimelineDateNavigator
          day="2026-06-10"
          isToday
          onPrev={jest.fn()}
          onNext={jest.fn()}
          onToday={jest.fn()}
        />,
      );
    });

    const labels = tree.root
      .findAllByType(Pressable)
      .map((p) => (p.props as { accessibilityLabel?: string }).accessibilityLabel);
    expect(labels).not.toContain("Jump to today");
  });
});
