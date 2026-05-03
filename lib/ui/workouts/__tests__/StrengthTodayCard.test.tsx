import React from "react";
import renderer, { act } from "react-test-renderer";

import { STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE } from "@/lib/data/workouts/strengthTodayCardModel";

import { StrengthTodayCard } from "../StrengthTodayCard";

describe("StrengthTodayCard", () => {
  it("renders fallback subtitle and includes it in accessibilityLabel", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthTodayCard
          loading={false}
          model={{
            kind: "completed",
            pill: "Completed",
            primaryTitle: "Back Day",
            durationLabel: "43 min",
            sectionEyebrow: "Completed Today",
            subtitle: STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE,
          }}
        />,
      );
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain(STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE);
    const card = tree!.root.findByProps({ testID: "strength-today-card" });
    expect(card.props.accessibilityLabel).toContain(STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE);
    expect(card.props.accessibilityLabel).toContain("Back Day");
    expect(card.props.accessibilityLabel).toContain("43 min");
  });

  it("renders detailed subtitle when present and exposes it on accessibilityLabel", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <StrengthTodayCard
          loading={false}
          model={{
            kind: "completed",
            pill: "Completed",
            primaryTitle: "Push",
            durationLabel: "40 min",
            sectionEyebrow: "Completed Today",
            subtitle: "12 sets · Chest focused",
          }}
        />,
      );
    });
    expect(JSON.stringify(tree!.toJSON())).toContain("12 sets · Chest focused");
    const card = tree!.root.findByProps({ testID: "strength-today-card" });
    expect(card.props.accessibilityLabel).toContain("12 sets · Chest focused");
  });
});
