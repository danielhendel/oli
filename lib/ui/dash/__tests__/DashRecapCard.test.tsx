// lib/ui/dash/__tests__/DashRecapCard.test.tsx
import React, { act } from "react";
import renderer from "react-test-renderer";
import { describe, expect, it, jest } from "@jest/globals";
import { Pressable } from "react-native";
import { DashRecapCard } from "../DashRecapCard";

function findViewsWithTestIdPrefix(root: renderer.ReactTestInstance, prefix: string): renderer.ReactTestInstance[] {
  const views = root.findAllByType("View");
  return views.filter((v) => {
    const id = (v.props as { testID?: string }).testID;
    return typeof id === "string" && id.startsWith(prefix);
  });
}

describe("DashRecapCard", () => {
  it("renders placement bars only for rows with bar.kind placement", () => {
    const onViewMore = jest.fn();
    const model = {
      kind: "ready" as const,
      dayKey: "2026-04-05",
      rows: [
        {
          id: "weight" as const,
          label: "Weight",
          valueText: "70 kg",
          isPlaceholder: false,
          bar: { kind: "none" as const },
        },
        {
          id: "steps" as const,
          label: "Steps",
          valueText: "6000",
          isPlaceholder: false,
          bar: { kind: "placement" as const, markerPosition01: 0.5 },
        },
      ],
    };

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashRecapCard model={model} onViewMore={onViewMore} />);
    });

    const bars = findViewsWithTestIdPrefix(test.root, "dash-daily-recap-bar-");
    expect(bars.length).toBeGreaterThanOrEqual(1);
    expect(
      bars.some((b) => (b.props as { testID?: string }).testID === "dash-daily-recap-bar-steps"),
    ).toBe(true);
    expect(
      bars.some((b) => (b.props as { testID?: string }).testID === "dash-daily-recap-bar-weight"),
    ).toBe(false);
  });

  it("invokes onViewMore when View More is pressed", () => {
    const onViewMore = jest.fn();
    const model = {
      kind: "ready" as const,
      dayKey: "2026-04-05",
      rows: [],
    };

    let test!: renderer.ReactTestRenderer;
    act(() => {
      test = renderer.create(<DashRecapCard model={model} onViewMore={onViewMore} />);
    });

    const texts = test.root.findAllByType("Text");
    expect(
      texts.some((t) => (t.children as unknown[]).some((c) => c === "View More")),
    ).toBe(true);

    const pressables = test.root.findAllByType(Pressable);
    expect(pressables.length).toBeGreaterThanOrEqual(1);
    act(() => {
      pressables[0]!.props.onPress();
    });
    expect(onViewMore).toHaveBeenCalledTimes(1);
  });
});
