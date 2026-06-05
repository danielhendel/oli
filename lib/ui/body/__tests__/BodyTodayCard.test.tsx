import React from "react";
import renderer, { act } from "react-test-renderer";

import { BodyTodayCard } from "@/lib/ui/body/BodyTodayCard";
import {
  buildBodyTodayCardModel,
  type BodyTodayOverviewSlice,
} from "@/lib/data/body/bodyTodayCardModel";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = require("react");
    return React.createElement("Text", { testID: `icon-${name}` }, name);
  },
}));

const FULL: BodyTodayOverviewSlice = {
  overviewDay: "2026-03-31",
  weightKg: 80,
  bmi: 24.2,
  bodyFatPercent: 18,
  leanBodyMassKg: 60,
  hasAnyMetric: true,
};

function collectText(tree: renderer.ReactTestRenderer): string {
  return tree.root
    .findAllByType("Text")
    .flatMap((n) => n.children)
    .filter((x): x is string => typeof x === "string")
    .join(" ");
}

describe("BodyTodayCard", () => {
  it("renders weight, BMI, body fat, and lean mass when available", async () => {
    const model = buildBodyTodayCardModel({ overview: FULL, unit: "lb" });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<BodyTodayCard loading={false} model={model} />);
    });
    const text = collectText(tree);
    expect(text).toContain("Today");
    expect(text).toContain("176.4 lb");
    expect(text).toContain("BMI");
    expect(text).toContain("24.2");
    expect(text).toContain("Body Fat");
    expect(text).toContain("18.0%");
    expect(text).toContain("Lean Mass");
    expect(text).toContain("132.3 lb");
    // no range/status pills on this card
    expect(text).not.toMatch(/Optimal|Out of range/);
  });

  it("invokes onPressRow with the metric detail href when a row is tapped", async () => {
    const model = buildBodyTodayCardModel({ overview: FULL, unit: "lb" });
    const onPressRow = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<BodyTodayCard loading={false} model={model} onPressRow={onPressRow} />);
    });
    const weightRow = tree.root.findByProps({ testID: "body-today-weight-row" });
    await act(async () => {
      weightRow.props.onPress();
    });
    expect(onPressRow).toHaveBeenCalledWith("/(app)/body/metric/weight");
    const bmiRow = tree.root.findByProps({ testID: "body-today-row-bmi" });
    await act(async () => {
      bmiRow.props.onPress();
    });
    expect(onPressRow).toHaveBeenLastCalledWith("/(app)/body/metric/bmi");
  });

  it("shows fallback dashes for missing supporting metrics", async () => {
    const model = buildBodyTodayCardModel({
      overview: { ...FULL, bmi: null, bodyFatPercent: null, leanBodyMassKg: null },
      unit: "lb",
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<BodyTodayCard loading={false} model={model} />);
    });
    expect(tree.root.findByProps({ testID: "body-today-row-bmi-value" }).props.children).toBe("\u2014");
  });

  it("renders an empty state when no metrics are available", async () => {
    const model = buildBodyTodayCardModel({
      overview: {
        overviewDay: null,
        weightKg: null,
        bmi: null,
        bodyFatPercent: null,
        leanBodyMassKg: null,
        hasAnyMetric: false,
      },
      unit: "lb",
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyTodayCard loading={false} model={model} emptyDescription="No body data found." />,
      );
    });
    expect(tree.root.findByProps({ testID: "body-today-empty-state" })).toBeDefined();
  });

  it("uses ≥44px tap targets on tappable rows", async () => {
    const model = buildBodyTodayCardModel({ overview: FULL, unit: "lb" });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<BodyTodayCard loading={false} model={model} onPressRow={jest.fn()} />);
    });
    const row = tree.root.findByProps({ testID: "body-today-row-lean" });
    const resolved =
      typeof row.props.style === "function" ? row.props.style({ pressed: false }) : row.props.style;
    const flat = Array.isArray(resolved)
      ? Object.assign({}, ...resolved.filter(Boolean))
      : resolved;
    expect(flat.minHeight).toBeGreaterThanOrEqual(44);
  });
});
