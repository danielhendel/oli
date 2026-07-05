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
    expect(text).toContain("Good afternoon");
    expect(text).toContain("Daniel");
    expect(text).not.toContain("Today Wednesday, May 13");
  });

  it("centers greeting text with distinct phrase and name styling", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<TodayHealthHero vm={mkVm()} />);
    });
    const texts = root.root.findAllByType("Text");
    const phrase = texts.find((n) => {
      const children = n.children as (string | number)[];
      return children.some((c) => typeof c === "string" && c.includes("Good afternoon"));
    });
    const name = texts.find((n) => {
      const children = n.children as (string | number)[];
      return children.some((c) => c === "Daniel");
    });
    expect(phrase?.props.style).toEqual(expect.objectContaining({ color: expect.any(String) }));
    expect(name?.props.style).toEqual(expect.objectContaining({ fontWeight: "600" }));
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
