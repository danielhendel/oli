// lib/ui/timeline/__tests__/TimelineEventCard.test.tsx
import React from "react";
import renderer, { act } from "react-test-renderer";
import { Pressable } from "react-native";

import { TimelineEventCard } from "@/lib/ui/timeline/TimelineEventCard";

const ITEM = {
  title: "Coffee",
  subtitle: "Breakfast · 5 kcal",
  icon: "cafe-outline",
  accessibilityLabel: "Coffee, Breakfast · 5 kcal",
};

describe("TimelineEventCard", () => {
  it("exposes an accessibility label that includes the time and title", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <TimelineEventCard item={ITEM} timeLabel="7:25 AM" onPress={jest.fn()} />,
      );
    });

    const pressable = tree.root.findByType(Pressable);
    const label = (pressable.props as { accessibilityLabel?: string }).accessibilityLabel ?? "";
    expect(label).toContain("7:25 AM");
    expect(label).toContain("Coffee");
    expect(label).toContain("Breakfast");
    expect((pressable.props as { accessibilityRole?: string }).accessibilityRole).toBe("button");
  });

  it("calls onPress when pressed", () => {
    const onPress = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <TimelineEventCard item={ITEM} timeLabel="7:25 AM" onPress={onPress} />,
      );
    });

    act(() => {
      (tree.root.findByType(Pressable).props as { onPress: () => void }).onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("omits chevron and press when not actionable", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <TimelineEventCard
          item={ITEM}
          timeLabel=""
          onPress={jest.fn()}
          actionable={false}
        />,
      );
    });
    const pressable = tree.root.findByType(Pressable);
    expect((pressable.props as { disabled?: boolean }).disabled).toBe(true);
    expect((pressable.props as { accessibilityRole?: string }).accessibilityRole).toBe("text");
  });
});
