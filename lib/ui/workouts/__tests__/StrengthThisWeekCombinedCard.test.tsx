import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet } from "react-native";

import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";
import { StrengthThisWeekCombinedCard } from "@/lib/ui/workouts/StrengthThisWeekCombinedCard";

describe("StrengthThisWeekCombinedCard", () => {
  const sessions = [
    {
      dayKey: "2026-03-09",
      sessionId: "sess-mon",
      displayTitle: "Leg Day",
      metadataLine: "16 sets • Quads focused • 62 min",
      rowAccessibilityLabel: "Open workout details w-leg",
      menuAccessibilityLabel: "Workout actions w-leg",
    },
    {
      dayKey: "2026-03-10",
      sessionId: "sess-tue",
      displayTitle: "Push Day",
      metadataLine: "",
      rowAccessibilityLabel: "Open workout details w-push",
      menuAccessibilityLabel: "Workout actions w-push",
    },
  ] as const;

  it("matches Weekly Working Volume elevated card shell", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthThisWeekCombinedCard
          loading={false}
          emptyMessage="No strength workouts this week yet"
          sessions={[...sessions]}
          onViewAll={jest.fn()}
          onPressSession={jest.fn()}
          onPressSessionMenu={jest.fn()}
        />,
      );
    });
    const card = tree.root.findByProps({ testID: "workouts-overview-this-week-combined-card" });
    const flat = StyleSheet.flatten(card.props.style ?? {});
    expect(flat.backgroundColor).toBe(UI_CARD_SURFACE);
    expect(flat.padding).toBe(15);
    expect(flat.borderRadius).toBe(12);
  });

  it("renders session rows with weekday, metadata, and 3-dot menu per workout", async () => {
    const onPressSessionMenu = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthThisWeekCombinedCard
          loading={false}
          emptyMessage="No strength workouts this week yet"
          sessions={[...sessions]}
          onViewAll={jest.fn()}
          onPressSession={jest.fn()}
          onPressSessionMenu={onPressSessionMenu}
        />,
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("This Week");
    expect(json).toContain("View All →");
    expect(json).toContain("Leg Day");
    expect(json).toContain("Push Day");
    expect(json).toContain("16 sets • Quads focused • 62 min");
    expect(json).not.toContain("workouts-overview-this-week-row-value-bar");
    expect(json).not.toContain("workouts-overview-this-week-row-sess-mon-accent");
    expect(json).not.toContain("workouts-overview-this-week-row-sess-tue-accent");

    const menuMon = tree.root.findByProps({ testID: "workouts-overview-this-week-row-sess-mon-menu" });
    const menuTue = tree.root.findByProps({ testID: "workouts-overview-this-week-row-sess-tue-menu" });
    expect(menuMon).toBeDefined();
    expect(menuTue).toBeDefined();

    await act(async () => {
      menuMon.props.onPress({ stopPropagation: jest.fn(), nativeEvent: { pageX: 10, pageY: 20 } });
    });
    expect(onPressSessionMenu).toHaveBeenCalledWith(
      "2026-03-09",
      "sess-mon",
      expect.objectContaining({ nativeEvent: expect.any(Object) }),
    );
  });

  it("omits metadata line when empty without placeholder text", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthThisWeekCombinedCard
          loading={false}
          emptyMessage="No strength workouts this week yet"
          sessions={[sessions[1]!]}
          onViewAll={jest.fn()}
          onPressSession={jest.fn()}
          onPressSessionMenu={jest.fn()}
        />,
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Push Day");
    expect(json).not.toContain("sets •");
  });

  it("View All invokes callback", async () => {
    const onViewAll = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthThisWeekCombinedCard
          loading={false}
          emptyMessage="No strength workouts this week yet"
          sessions={[]}
          onViewAll={onViewAll}
          onPressSession={jest.fn()}
          onPressSessionMenu={jest.fn()}
        />,
      );
    });
    const viewAll = tree.root.findByProps({ testID: "strength-recent-week-combined-view-more" });
    await act(async () => {
      viewAll.props.onPress();
    });
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });
});
