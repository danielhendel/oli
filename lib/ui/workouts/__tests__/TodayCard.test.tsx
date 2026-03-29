import React from "react";
import renderer, { act } from "react-test-renderer";
import { buildTodayOverviewModel } from "@/lib/data/workouts/todayOverviewModel";
import { TodayCard } from "@/lib/ui/workouts/TodayCard";

describe("TodayCard", () => {
  it("invokes onViewMore when header link is pressed", () => {
    const onViewMore = jest.fn();
    const model = buildTodayOverviewModel(null);
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TodayCard model={model} onViewMore={onViewMore} />);
    });
    const link = tree.root.findByProps({ accessibilityLabel: "View more" });
    act(() => {
      link.props.onPress();
    });
    expect(onViewMore).toHaveBeenCalledTimes(1);
  });
});
