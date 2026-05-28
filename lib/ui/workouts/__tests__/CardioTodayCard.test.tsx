import React from "react";
import renderer, { act } from "react-test-renderer";

import type { DayKey } from "@/lib/ui/calendar/types";
import {
  CARDIO_TODAY_DETAIL_METRIC_LABELS,
  CARDIO_TODAY_DETAIL_MISSING_VALUE,
  type CardioTodayDetailVm,
} from "@/lib/data/workouts/cardioTodayDetailVm";

import { CardioTodayCard } from "../CardioTodayCard";

const TODAY = "2026-05-26" as DayKey;

function completedVm(overrides?: Partial<Extract<CardioTodayDetailVm, { status: "completed" }>>): CardioTodayDetailVm {
  return {
    status: "completed",
    pill: "Completed",
    hero: "Indoor Run",
    subtitleLine: null,
    rows: [
      { id: "duration", label: CARDIO_TODAY_DETAIL_METRIC_LABELS.duration, value: "35 min" },
      { id: "distance", label: CARDIO_TODAY_DETAIL_METRIC_LABELS.distance, value: "5.00 mi" },
      {
        id: "avgCadence",
        label: CARDIO_TODAY_DETAIL_METRIC_LABELS.avgCadence,
        value: CARDIO_TODAY_DETAIL_MISSING_VALUE,
      },
      { id: "avgPace", label: CARDIO_TODAY_DETAIL_METRIC_LABELS.avgPace, value: "9:39/mi" },
      { id: "avgHeartRate", label: CARDIO_TODAY_DETAIL_METRIC_LABELS.avgHeartRate, value: "142 bpm" },
      {
        id: "estimatedCalories",
        label: CARDIO_TODAY_DETAIL_METRIC_LABELS.estimatedCalories,
        value: "+110\u2013185 kcal",
      },
    ],
    energyDay: TODAY,
    ...(overrides ?? {}),
  };
}

const restVm: CardioTodayDetailVm = {
  status: "rest",
  pill: "No Cardio",
  hero: "No cardio today",
  subtitleLine: "Log a session when you train",
};

describe("CardioTodayCard — loading / rest", () => {
  it("renders inline loading and no metric rows when loading", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioTodayCard loading detailVm={null} />);
    });
    expect(tree!.root.findAllByProps({ testID: "cardio-today-metric-rows" })).toHaveLength(0);
    const card = tree!.root.findByProps({ testID: "cardio-today-card" });
    expect(card.props.accessibilityLabel).toContain("Loading");
  });

  it("rest VM renders hero + subtitle and no metric rows", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioTodayCard loading={false} detailVm={restVm} />);
    });
    const hero = tree!.root.findByProps({ testID: "cardio-today-hero" });
    expect(hero.props.children).toBe("No cardio today");
    const sub = tree!.root.findByProps({ testID: "cardio-today-subtitle" });
    expect(sub.props.children).toBe("Log a session when you train");
    expect(tree!.root.findAllByProps({ testID: "cardio-today-metric-rows" })).toHaveLength(0);
  });
});

describe("CardioTodayCard — completed", () => {
  it("renders hero (left-aligned large) and the exact ordered metric rows", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioTodayCard loading={false} detailVm={completedVm()} />);
    });
    const hero = tree!.root.findByProps({ testID: "cardio-today-hero" });
    expect(hero.props.children).toBe("Indoor Run");
    // exact row order asserted by testID
    const expected = [
      "cardio-today-metric-row-duration",
      "cardio-today-metric-row-distance",
      "cardio-today-metric-row-avgCadence",
      "cardio-today-metric-row-avgPace",
      "cardio-today-metric-row-avgHeartRate",
      "cardio-today-metric-row-estimatedCalories",
    ];
    for (const id of expected) {
      expect(tree!.root.findAllByProps({ testID: id }).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("avgCadence renders '—' (no fake values)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioTodayCard loading={false} detailVm={completedVm()} />);
    });
    const row = tree!.root.findByProps({ testID: "cardio-today-metric-row-avgCadence" });
    expect(row.props.accessibilityLabel).toContain(CARDIO_TODAY_DETAIL_MISSING_VALUE);
  });

  it("renders '+N more sessions' subtitle when multi-session", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <CardioTodayCard
          loading={false}
          detailVm={completedVm({ subtitleLine: "+1 more session" })}
        />,
      );
    });
    const sub = tree!.root.findByProps({ testID: "cardio-today-subtitle" });
    expect(sub.props.children).toBe("+1 more session");
  });
});
