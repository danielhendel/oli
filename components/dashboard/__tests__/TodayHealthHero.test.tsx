import React, { act } from "react";
import renderer from "react-test-renderer";

import type { TodayHealthHeroViewModel } from "@/lib/dashboard/todayHealthHero";

import { TodayHealthHero } from "../TodayHealthHero";

function mkVm(over: Partial<TodayHealthHeroViewModel> = {}): TodayHealthHeroViewModel {
  return {
    greetingPhrase: "Good afternoon",
    firstName: "Daniel",
    dateLine: "Today Wednesday, May 13",
    loading: false,
    sleepRecovery: {
      sleepDisplay: "8h 12m",
      recoveryDisplay: "Good",
      footerLabel: "Last night",
      loading: false,
      accessibilityLabel:
        "Last night summary. Sleep 8 hours 12 minutes. Recovery good.",
    },
    ...over,
  };
}

describe("TodayHealthHero", () => {
  it("renders greeting without the date line", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TodayHealthHero vm={mkVm()} />);
    });
    const text = root.root
      .findAllByType("Text")
      .map((n) =>
        (n.children as (string | number)[])
          .filter((c) => typeof c === "string" || typeof c === "number")
          .join(""),
      )
      .join(" ");
    expect(text).toContain("Good afternoon, Daniel");
    expect(text).not.toContain("Today Wednesday, May 13");
  });

  it("shows greeting skeleton while loading", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TodayHealthHero vm={mkVm({ loading: true })} />);
    });
    const header = root.root.find((n) => {
      const p = n.props as { accessibilityLabel?: string };
      return p.accessibilityLabel === "Loading greeting";
    });
    expect(header).toBeTruthy();
  });
});
