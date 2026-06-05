import React from "react";
import renderer, { act } from "react-test-renderer";

import { BodyWeightBaselineDeltaCard } from "@/lib/ui/body/BodyWeightBaselineDeltaCard";
import { buildBodyWeightBaselineDeltaModel } from "@/lib/data/body/bodyWeightBaselineDeltaModel";
import type { BodyWeightSample } from "@/lib/data/body/bodyWeightDailySeries";

function s(dayKey: string, weightKg: number): BodyWeightSample {
  return { dayKey, observedAt: `${dayKey}T08:00:00.000Z`, weightKg };
}

function collectText(tree: renderer.ReactTestRenderer): string {
  return tree.root
    .findAllByType("Text")
    .flatMap((n) => n.children)
    .filter((x): x is string => typeof x === "string")
    .join(" ");
}

describe("BodyWeightBaselineDeltaCard", () => {
  it("renders all five period rows with signed deltas and no status pills", async () => {
    const model = buildBodyWeightBaselineDeltaModel({
      todayDayKey: "2026-03-31",
      unit: "lb",
      samples: [
        s("2025-06-01", 78),
        s("2026-01-15", 79),
        s("2026-03-05", 79),
        s("2026-03-25", 81),
        s("2026-03-31", 80),
      ],
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<BodyWeightBaselineDeltaCard loading={false} model={model} />);
    });
    const text = collectText(tree);
    expect(text).toContain("Weight Baseline");
    for (const label of ["7 Day", "30 Day", "90 Day", "YTD", "12 Month"]) {
      expect(text).toContain(label);
    }
    expect(tree.root.findByProps({ testID: "body-weight-baseline-row-7d-value" }).props.children).toBe(
      "-2.2 lb",
    );
    expect(tree.root.findByProps({ testID: "body-weight-baseline-row-12m-value" }).props.children).toBe(
      "+4.4 lb",
    );
    expect(text).not.toMatch(/Optimal|Out of range|Maintaining|Gaining|Losing/);
  });

  it("renders 'Not enough data' for insufficient periods", async () => {
    const model = buildBodyWeightBaselineDeltaModel({
      todayDayKey: "2026-03-31",
      unit: "lb",
      samples: [s("2026-03-30", 80)],
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<BodyWeightBaselineDeltaCard loading={false} model={model} />);
    });
    expect(
      tree.root.findByProps({ testID: "body-weight-baseline-row-7d-value" }).props.children,
    ).toBe("Not enough data");
  });
});
