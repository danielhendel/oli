import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, it, expect } from "@jest/globals";

import type { ActivityTodayOverviewCardModel } from "@/lib/data/activity/activityTodayOverviewCardModel";
import { ActivityTodayCard } from "@/lib/ui/activity/ActivityTodayCard";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
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
  it("renders only contributing buckets when allocation is present (zero buckets hidden)", async () => {
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
    expect(tree.root.findByProps({ testID: "activity-today-allocation-row-neat" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "activity-today-allocation-row-cardio" })).toBeTruthy();
    expect(
      tree.root.findAllByProps({ testID: "activity-today-allocation-row-strength" }),
    ).toHaveLength(0);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("5,421 steps");
    expect(json).toContain("4,579 steps");
    expect(json).toContain("NEAT");
    expect(json).toContain("Cardio");
    expect(json).not.toContain("Strength");
    expect(json).not.toContain("Strength 0 steps");
  });

  it("renders only NEAT row on a NEAT-only day (Strength and Cardio both 0)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityTodayCard
          loading={false}
          error={null}
          model={makeModel({
            stepsDigits: "21",
            compactStatsSummaryForA11y: "21 steps",
            stepsAllocation: { neatSteps: 21, strengthSteps: 0, cardioSteps: 0 },
          })}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "activity-today-allocation" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "activity-today-allocation-row-neat" })).toBeTruthy();
    expect(
      tree.root.findAllByProps({ testID: "activity-today-allocation-row-strength" }),
    ).toHaveLength(0);
    expect(
      tree.root.findAllByProps({ testID: "activity-today-allocation-row-cardio" }),
    ).toHaveLength(0);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("21 steps");
    expect(json).toContain("NEAT");
    expect(json).not.toContain("Strength");
    expect(json).not.toContain("Cardio");
  });

  it("renders Strength and Cardio only when NEAT is 0 (workout-attributed day)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityTodayCard
          loading={false}
          error={null}
          model={makeModel({
            stepsAllocation: { neatSteps: 0, strengthSteps: 3000, cardioSteps: 2000 },
          })}
        />,
      );
    });
    expect(tree.root.findByProps({ testID: "activity-today-allocation" })).toBeTruthy();
    expect(
      tree.root.findAllByProps({ testID: "activity-today-allocation-row-neat" }),
    ).toHaveLength(0);
    expect(tree.root.findByProps({ testID: "activity-today-allocation-row-strength" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "activity-today-allocation-row-cardio" })).toBeTruthy();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("3,000 steps");
    expect(json).toContain("2,000 steps");
    expect(json).not.toContain("NEAT");
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
    expect(root.props.accessibilityLabel).toContain("Cardio 4,579 steps");
    expect(root.props.accessibilityLabel).not.toContain("Strength 0 steps");
    expect(root.props.accessibilityLabel).not.toContain("Strength");
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

describe("ActivityTodayCard — Daily Energy parity redesign", () => {
  it("does not render the activity status/range pill", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityTodayCard
          loading={false}
          error={null}
          model={makeModel({
            tierPill: {
              ...getStepRatingActivityDescriptorPill(500),
            },
          })}
        />,
      );
    });
    expect(tree.root.findAllByProps({ testID: "activity-today-tier-pill" })).toHaveLength(0);
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toMatch(/Sedentary/);
    expect(json).not.toMatch(/Lightly Active/);
  });

  it("keeps the Today title, combined steps metric, progress bar, and baseline subtitle", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityTodayCard
          loading={false}
          error={null}
          model={makeModel({
            stepsDigits: "8,421",
            subtitle: "1,000 steps above your baseline",
            compactStatsSummaryForA11y: "8,421 steps",
          })}
        />,
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('"Today"');
    expect(json).toContain('"8,421 Steps"');
    // Old separate Text nodes are gone — neither a bare "Steps" label nor a bare "8,421" figure.
    expect(json).not.toContain('"Steps"');
    expect(json).not.toContain('"8,421"');
    expect(json).toContain("1,000 steps above your baseline");
    expect(tree.root.findByProps({ testID: "activity-today-steps-metric" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "activity-today-tier-progress" })).toBeTruthy();
    expect(tree.root.findByProps({ testID: "activity-today-subtitle" })).toBeTruthy();
  });

  it("renders the Today progress bar with the Daily Energy fill color", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityTodayCard loading={false} error={null} model={makeModel()} />,
      );
    });
    const progress = tree.root.findByProps({ testID: "activity-today-tier-progress" });
    expect(progress.props.fillColorOverride).toBe(ENERGY_BASELINE_FILL_COLOR);
  });

  it("removes the tier label from the root accessibility label (no status pill)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <ActivityTodayCard
          loading={false}
          error={null}
          model={makeModel({
            tierPill: { ...getStepRatingActivityDescriptorPill(500) },
          })}
        />,
      );
    });
    const root = tree.root.findByProps({ testID: "activity-today-card" });
    expect(root.props.accessibilityLabel).not.toContain("Sedentary");
    expect(root.props.accessibilityLabel).not.toContain("Lightly Active");
    // Root label leads with "Today." and then announces the combined metric naturally
    // ("10,000 steps") — no redundant "Steps." segment now that the headline is one phrase.
    expect(root.props.accessibilityLabel).toMatch(/^Today\. 10,000 steps\./);
    expect(root.props.accessibilityLabel).not.toMatch(/Today\. Steps\./);
  });
});
