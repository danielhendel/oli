import React from "react";
import renderer, { act } from "react-test-renderer";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import { buildStrengthOverviewCardModel } from "@/lib/data/workouts/strengthOverviewCardModel";
import {
  STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN,
  computeStrengthOverviewMarkerPosition01,
  getStrengthOverviewTierSegmentBounds01,
} from "@/lib/data/workouts/strengthOverviewTimeframeRating";
import {
  getStrengthOverviewMarkerColorForRatingLabel,
  STRENGTH_OVERVIEW_TIER_ZONE_BG,
  StrengthOverviewCard,
} from "@/lib/ui/workouts/StrengthOverviewCard";

describe("STRENGTH_OVERVIEW_TIER_ZONE_BG", () => {
  it("defines five segments Low through Optimal", () => {
    expect(STRENGTH_OVERVIEW_TIER_ZONE_BG).toHaveLength(5);
  });
});

describe("getStrengthOverviewMarkerColorForRatingLabel", () => {
  it("Strong uses pill-matched green, not Optimal blue, regardless of score position semantics", () => {
    expect(getStrengthOverviewMarkerColorForRatingLabel("Strong")).toBe("#5EC08C");
    expect(getStrengthOverviewMarkerColorForRatingLabel("Optimal")).toBe("#5C8FE6");
    expect(getStrengthOverviewMarkerColorForRatingLabel("Strong")).not.toBe(
      getStrengthOverviewMarkerColorForRatingLabel("Optimal"),
    );
  });
});

describe("Strength Overview bar marker (tier segment + color)", () => {
  it("Strong + near-Optimal scoringAvg keeps marker before Optimal segment; color stays Strong green", () => {
    const optimalStart = getStrengthOverviewTierSegmentBounds01("optimal").start;
    const marker01 = computeStrengthOverviewMarkerPosition01({
      tier: "strong",
      scoringAvg: STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN - 1e-6,
    });
    expect(marker01).toBeLessThan(optimalStart);
    expect(getStrengthOverviewMarkerColorForRatingLabel("Strong")).toBe("#5EC08C");
  });
});

describe("StrengthOverviewCard", () => {
  const today = "2026-04-04";
  const weekStart = "2026-03-30";
  const weekEnd = "2026-04-05";

  function minimalModel() {
    return buildStrengthOverviewCardModel({
      strengthCalendarDays: [],
      analyticsDaysSlice: [],
      todayDayKey: today,
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
      manualWorkoutSummaries: [],
    });
  }

  it("renders four timeframes with compact stats, pills, and bars", () => {
    const model = minimalModel();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <StrengthOverviewCard loading={false} model={model} onViewMore={jest.fn()} />,
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Overview");
    expect(json).toContain("YTD");
    expect(json).toContain("3 Month");
    expect(json).toContain("MTD");
    expect(json).toContain("This Week");
    expect(json).toContain("0 workouts · — / week");
    expect(json).not.toContain("Limited training consistency");
    expect(json).not.toContain("Total workouts");
    expect(json).not.toContain("Avg per week");
    expect(json).not.toContain("Avg duration");

    const barWrapRe = /^strength-overview-consistency-bar-(ytd|threeMonth|mtd|thisWeek)$/;
    const bars = tree.root.findAll(
      (n) => typeof n.props?.testID === "string" && barWrapRe.test(n.props.testID as string),
    );
    const barTestIds = new Set(bars.map((n) => n.props.testID as string));
    expect(barTestIds.size).toBe(4);
    expect(barTestIds.has("strength-overview-consistency-bar-ytd")).toBe(true);
    expect(barTestIds.has("strength-overview-consistency-bar-threeMonth")).toBe(true);
    expect(barTestIds.has("strength-overview-consistency-bar-mtd")).toBe(true);
    expect(barTestIds.has("strength-overview-consistency-bar-thisWeek")).toBe(true);

    const ytdBar = tree.root
      .findAllByProps({ testID: "strength-overview-consistency-bar-ytd" })
      .find((n) => typeof n.props.onLayout === "function");
    expect(ytdBar).toBeDefined();
    expect(typeof ytdBar!.props.onLayout).toBe("function");
    expect(
      tree.root.findAllByProps({ testID: "strength-overview-consistency-bar-ytd-zones" }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows loading state when loading", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StrengthOverviewCard loading model={null} onViewMore={jest.fn()} />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain("Loading workouts");
  });

  it("invokes onViewMore from header link", () => {
    const onViewMore = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <StrengthOverviewCard loading={false} model={minimalModel()} onViewMore={onViewMore} />,
      );
    });
    const link = tree.root.findByProps({ accessibilityLabel: "View more" });
    act(() => {
      link.props.onPress();
    });
    expect(onViewMore).toHaveBeenCalledTimes(1);
  });

  it("renders compact stats when threeMonth has workouts", () => {
    const threeStart = addCalendarDaysToDayKey(today, -(90 - 1));
    const days = [
      {
        day: threeStart,
        workouts: [
          {
            id: "s",
            observedAt: `${threeStart}T12:00:00.000Z`,
            sourceId: "apple_health",
            title: "Lift",
            workoutType: "strength" as const,
            start: `${threeStart}T12:00:00.000Z`,
            end: `${threeStart}T12:30:00.000Z`,
            durationMinutes: 30,
            calories: null,
          },
        ],
      },
    ];
    const model = buildStrengthOverviewCardModel({
      strengthCalendarDays: days,
      analyticsDaysSlice: days,
      todayDayKey: today,
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
      manualWorkoutSummaries: [],
    });
    const tm = model.timeframes.find((t) => t.key === "threeMonth")!;
    expect(tm.rating.progress).toBeGreaterThan(0);
    expect(tm.compactStatsSummary).toContain("workout");
    expect(tm.compactStatsSummary).toContain("/ week");

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StrengthOverviewCard loading={false} model={model} />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain(tm.compactStatsSummary);
  });
});
