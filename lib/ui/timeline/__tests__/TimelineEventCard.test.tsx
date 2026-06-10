// lib/ui/timeline/__tests__/TimelineEventCard.test.tsx
import React from "react";
import renderer, { act } from "react-test-renderer";
import { Pressable } from "react-native";

import { TimelineEventCard } from "@/lib/ui/timeline/TimelineEventCard";
import type { TimelineDayItem } from "@/lib/features/timeline/types";

const ITEM: TimelineDayItem = {
  id: "n1",
  day: "2026-06-10",
  timestamp: "2026-06-10T07:25:00.000Z",
  sortKey: "2026-06-10T07:25:00.000Z#n1",
  title: "Coffee",
  subtitle: "Breakfast · 5 kcal",
  sourceType: "caffeine",
  sourceId: "n1",
  icon: "cafe-outline",
  href: "/(app)/nutrition/day/2026-06-10",
  isPassive: false,
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

  it("calls onPress with the item", () => {
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
    expect(onPress).toHaveBeenCalledWith(ITEM);
  });
});
