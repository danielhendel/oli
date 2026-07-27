import React, { act } from "react";
import { Text } from "react-native";
import renderer from "react-test-renderer";

import { buildReadinessContributorDetailViewModel } from "@/lib/data/readiness/buildReadinessContributorDetailViewModel";
import { ReadinessContributorDetailSheet } from "@/lib/ui/readiness/ReadinessContributorDetailSheet";
import {
  UI_READINESS_SCORE_FAIR_FILL,
  UI_READINESS_SCORE_GOOD_FILL,
  UI_READINESS_SCORE_OPTIMAL_FILL,
  UI_READINESS_SCORE_PAY_ATTENTION_FILL,
} from "@/lib/ui/theme/readinessContributorScoreChrome";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { ReadinessContributorDayCell } from "@/lib/data/readiness/readinessContributorHistoryTypes";

const selected = "2026-05-18" as DayKey;

function fill(count: number, score: number): Partial<Record<DayKey, ReadinessContributorDayCell>> {
  const map: Partial<Record<DayKey, ReadinessContributorDayCell>> = {};
  for (let i = 0; i < count; i += 1) {
    const day = addCalendarDaysToDayKey(selected, -(count - 1 - i));
    map[day] = {
      settled: true,
      day: {
        day,
        score: 80,
        source: "oura",
        contributors: { hrv_balance: score },
      },
    };
  }
  return map;
}

function allText(root: renderer.ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map((t) => {
      const ch = t.props.children;
      if (typeof ch === "string") return ch;
      if (Array.isArray(ch)) return ch.filter((x): x is string => typeof x === "string").join("");
      return "";
    })
    .join("|");
}

describe("ReadinessContributorDetailSheet", () => {
  it("renders hero, four zones, one marker, pattern, and education without medical claims", () => {
    const vm = buildReadinessContributorDetailViewModel({
      metric: "hrv_balance",
      selectedDay: selected,
      todayDayKey: selected,
      currentScore: 82,
      dayByDay: fill(30, 82),
      historyStatus: "ready",
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ReadinessContributorDetailSheet visible onClose={() => undefined} vm={vm} />,
      );
    });

    const flat = allText(tree.root);
    expect(flat).toContain("HRV Balance");
    expect(flat).toContain("82");
    expect(flat).toContain("Good");
    expect(flat).toContain("Oura contributor score");
    expect(flat).toContain("Pay Attention");
    expect(flat).toContain("Fair");
    expect(flat).toContain("Optimal");
    expect(flat).toContain("0–59");
    expect(flat).toContain("85–100");
    expect(flat).toContain("Your Pattern");
    expect(flat).toContain("7-day average");
    expect(flat).toContain("What it measures");
    expect(flat).toContain("Data & accuracy");
    expect(flat).not.toMatch(/\bms\b/);
    expect(flat).not.toMatch(/Healthy range|Clinical range|Recommended range/i);
    expect(flat).not.toMatch(/coverage|YTD|percent change/i);

    const barTestId = "readiness-contributor-detail-sheet-score-bar";
    expect(tree.root.findByProps({ testID: `${barTestId}-marker` })).toBeDefined();
    expect(tree.root.findByProps({ testID: `${barTestId}-pay-attention-zone` }).props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: UI_READINESS_SCORE_PAY_ATTENTION_FILL }),
      ]),
    );
    expect(tree.root.findByProps({ testID: `${barTestId}-fair-zone` }).props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: UI_READINESS_SCORE_FAIR_FILL }),
      ]),
    );
    expect(tree.root.findByProps({ testID: `${barTestId}-good-zone` }).props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: UI_READINESS_SCORE_GOOD_FILL }),
      ]),
    );
    expect(tree.root.findByProps({ testID: `${barTestId}-optimal-zone` }).props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: UI_READINESS_SCORE_OPTIMAL_FILL }),
      ]),
    );
    expect(() => tree.root.findByProps({ testID: `${barTestId}-legend` })).toThrow();
    expect(() => tree.root.findByProps({ testID: `${barTestId}-ninety-day-marker` })).toThrow();
  });

  it("Body Temperature sheet never shows degrees or deviation", () => {
    const vm = buildReadinessContributorDetailViewModel({
      metric: "body_temperature",
      selectedDay: selected,
      todayDayKey: selected,
      currentScore: 91,
      dayByDay: fill(30, 91),
      historyStatus: "ready",
    });
    // Override contributors key in fill — rebuild with body_temperature
    const dayByDay: Partial<Record<DayKey, ReadinessContributorDayCell>> = {};
    for (let i = 0; i < 30; i += 1) {
      const day = addCalendarDaysToDayKey(selected, -(29 - i));
      dayByDay[day] = {
        settled: true,
        day: {
          day,
          score: 80,
          source: "oura",
          contributors: { body_temperature: 91 },
        },
      };
    }
    const bodyVm = buildReadinessContributorDetailViewModel({
      metric: "body_temperature",
      selectedDay: selected,
      todayDayKey: selected,
      currentScore: 91,
      dayByDay,
      historyStatus: "ready",
    });
    void vm;

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ReadinessContributorDetailSheet visible onClose={() => undefined} vm={bodyVm} />,
      );
    });
    const flat = allText(tree.root);
    expect(flat).toContain("Body Temperature");
    expect(flat).toContain("91");
    expect(flat).toContain("Optimal");
    expect(flat).not.toMatch(/°C|°F|fever/i);
    expect(flat).toMatch(/does not currently display or reconstruct/);
    expect(flat).not.toMatch(/\+\d\.\d°C|−\d\.\d°C|-\d\.\d°C/);
  });

  it("shows retry on history error while keeping current score", () => {
    const vm = buildReadinessContributorDetailViewModel({
      metric: "recovery_index",
      selectedDay: selected,
      todayDayKey: selected,
      currentScore: 90,
      dayByDay: {},
      historyStatus: "error",
      historyErrorMessage: "Could not load recent averages.",
    });
    const onRetry = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ReadinessContributorDetailSheet
          visible
          onClose={() => undefined}
          vm={vm}
          onRetryHistory={onRetry}
        />,
      );
    });
    expect(allText(tree.root)).toContain("90");
    const retry = tree.root.findByProps({
      testID: "readiness-contributor-detail-sheet-history-retry",
    });
    act(() => {
      retry.props.onPress();
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
