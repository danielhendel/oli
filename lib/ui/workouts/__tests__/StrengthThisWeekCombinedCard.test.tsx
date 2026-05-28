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
          onPressSession={jest.fn()}
          onPressSessionMenu={onPressSessionMenu}
        />,
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("This Week");
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
          onPressSession={jest.fn()}
          onPressSessionMenu={jest.fn()}
        />,
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Push Day");
    expect(json).not.toContain("sets •");
  });

  it("no longer renders a View All entry point", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthThisWeekCombinedCard
          loading={false}
          emptyMessage="No strength workouts this week yet"
          sessions={[...sessions]}
          onPressSession={jest.fn()}
          onPressSessionMenu={jest.fn()}
        />,
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain("View All →");
    expect(json).not.toContain("strength-recent-week-combined-view-more");
  });

  it("renders the Activity-style week navigator when weekRangeLabel is provided", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthThisWeekCombinedCard
          loading={false}
          emptyMessage="No strength workouts this week yet"
          sessions={[...sessions]}
          onPressSession={jest.fn()}
          onPressSessionMenu={jest.fn()}
          weekRangeLabel={"May 24\u201330"}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={jest.fn()}
        />,
      );
    });
    const label = tree.root.findByProps({ testID: "workouts-this-week-range-label" });
    expect(label.props.children).toBe("May 24\u201330");
    expect(label.props.accessibilityLabel).toBe("Week of May 24\u201330");
    expect(tree.root.findByProps({ testID: "workouts-this-week-nav" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "workouts-this-week-nav-previous" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "workouts-this-week-nav-next" })).toBeDefined();
  });

  it("omits the nav cluster when weekRangeLabel is not provided", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthThisWeekCombinedCard
          loading={false}
          emptyMessage="No strength workouts this week yet"
          sessions={[...sessions]}
          onPressSession={jest.fn()}
          onPressSessionMenu={jest.fn()}
        />,
      );
    });
    expect(() => tree.root.findByProps({ testID: "workouts-this-week-nav" })).toThrow();
  });

  it("previous chevron press fires onPressPrevious", async () => {
    const onPressPrevious = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthThisWeekCombinedCard
          loading={false}
          emptyMessage="No strength workouts this week yet"
          sessions={[...sessions]}
          onPressSession={jest.fn()}
          onPressSessionMenu={jest.fn()}
          weekRangeLabel={"May 24\u201330"}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={onPressPrevious}
          onPressNext={jest.fn()}
        />,
      );
    });
    const prev = tree.root.findByProps({ testID: "workouts-this-week-nav-previous" });
    expect(prev.props.disabled).toBe(false);
    expect(prev.props.accessibilityState).toEqual({ disabled: false });
    await act(async () => {
      prev.props.onPress();
    });
    expect(onPressPrevious).toHaveBeenCalledTimes(1);
  });

  it("next chevron is disabled when canGoNext is false (current week)", async () => {
    const onPressNext = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthThisWeekCombinedCard
          loading={false}
          emptyMessage="No strength workouts this week yet"
          sessions={[...sessions]}
          onPressSession={jest.fn()}
          onPressSessionMenu={jest.fn()}
          weekRangeLabel={"May 24\u201330"}
          canGoPrevious
          canGoNext={false}
          onPressPrevious={jest.fn()}
          onPressNext={onPressNext}
        />,
      );
    });
    const next = tree.root.findByProps({ testID: "workouts-this-week-nav-next" });
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });
});
