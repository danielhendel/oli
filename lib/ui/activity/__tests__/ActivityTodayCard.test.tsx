import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, it, expect } from "@jest/globals";

import type { ActivityTodayOverviewCardModel } from "@/lib/data/activity/activityTodayOverviewCardModel";
import { ActivityTodayCard } from "@/lib/ui/activity/ActivityTodayCard";
import { getStepRatingActivityDescriptorPill } from "@/lib/utils/activityStepRating";

function makeModel(
  overrides?: Partial<ActivityTodayOverviewCardModel>,
): ActivityTodayOverviewCardModel {
  return {
    stepsDigits: "10,000",
    tierPill: getStepRatingActivityDescriptorPill(10000),
    subtitle: "Steps recorded today",
    compactStatsSummaryForA11y: "10,000 steps",
    activityTierIndexForBar: 2,
    fillWidth01Override: 0.5,
    ...overrides,
  };
}

describe("ActivityTodayCard — Phase 2B allocation rows", () => {
  it("renders three rows with formatted values when allocation is present", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityTodayCard
          loading={false}
          error={null}
          model={makeModel({
            stepsAllocation: { neatSteps: 5421, strengthSteps: 0, cardioSteps: 4579 },
          })}
        />,
      );
    });
    const block = tree.root.findByProps({ testID: "activity-today-allocation" });
    expect(block).toBeTruthy();
    const neat = tree.root.findByProps({ testID: "activity-today-allocation-row-neat" });
    const strength = tree.root.findByProps({ testID: "activity-today-allocation-row-strength" });
    const cardio = tree.root.findByProps({ testID: "activity-today-allocation-row-cardio" });
    expect(neat).toBeTruthy();
    expect(strength).toBeTruthy();
    expect(cardio).toBeTruthy();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("5,421 steps");
    expect(json).toContain("0 steps");
    expect(json).toContain("4,579 steps");
    expect(json).toContain("NEAT");
    expect(json).toContain("Strength");
    expect(json).toContain("Cardio");
  });

  it("hides allocation block when stepsAllocation is missing", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityTodayCard loading={false} error={null} model={makeModel()} />,
      );
    });
    const matches = tree.root.findAllByProps({ testID: "activity-today-allocation" });
    expect(matches).toHaveLength(0);
  });

  it("hides allocation block when loading", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityTodayCard
          loading={true}
          error={null}
          model={makeModel({
            stepsAllocation: { neatSteps: 5421, strengthSteps: 0, cardioSteps: 4579 },
          })}
        />,
      );
    });
    expect(tree.root.findAllByProps({ testID: "activity-today-allocation" })).toHaveLength(0);
  });

  it("hides allocation block on error", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityTodayCard
          loading={false}
          error={{ message: "oops", requestId: null, onRetry: jest.fn() }}
          model={makeModel({
            stepsAllocation: { neatSteps: 5421, strengthSteps: 0, cardioSteps: 4579 },
          })}
        />,
      );
    });
    expect(tree.root.findAllByProps({ testID: "activity-today-allocation" })).toHaveLength(0);
  });

  it("allocation rows are not pressable and have no chevron glyph", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityTodayCard
          loading={false}
          error={null}
          model={makeModel({
            stepsAllocation: { neatSteps: 100, strengthSteps: 0, cardioSteps: 0 },
          })}
        />,
      );
    });
    const neat = tree.root.findByProps({ testID: "activity-today-allocation-row-neat" });
    expect(neat.props.onPress).toBeUndefined();
    expect(neat.props.accessibilityRole).not.toBe("button");
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toMatch(/chevron/i);
  });

  it("appends allocation summary to the root accessibility label when present", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityTodayCard
          loading={false}
          error={null}
          model={makeModel({
            stepsAllocation: { neatSteps: 5421, strengthSteps: 0, cardioSteps: 4579 },
          })}
        />,
      );
    });
    const root = tree.root.findByProps({ testID: "activity-today-card" });
    expect(root.props.accessibilityLabel).toContain("NEAT 5,421 steps");
    expect(root.props.accessibilityLabel).toContain("Strength 0 steps");
    expect(root.props.accessibilityLabel).toContain("Cardio 4,579 steps");
  });

  it("omits allocation summary from the root accessibility label when allocation absent", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityTodayCard loading={false} error={null} model={makeModel()} />,
      );
    });
    const root = tree.root.findByProps({ testID: "activity-today-card" });
    expect(root.props.accessibilityLabel).not.toContain("NEAT");
    expect(root.props.accessibilityLabel).not.toContain("Strength");
    expect(root.props.accessibilityLabel).not.toContain("Cardio");
  });
});
