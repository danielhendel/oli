import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

import { HR_ZONE_ROW_MISSING_VALUE, HrZoneRow } from "@/lib/ui/workouts/HrZoneRow";

const TEST_PREFIX = "test-zone";

describe("HrZoneRow", () => {
  it("renders zone label, duration, and range when minutes > 0", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <HrZoneRow
          zoneLabel="Zone 1"
          zoneNumber={1}
          durationLabel="32:49"
          rangeLabel="<110 bpm"
          minutes={32.816}
          maxZoneMinutes={32.816}
          testIDPrefix={TEST_PREFIX}
        />,
      );
    });
    const row = tree!.root.findByProps({ testID: `${TEST_PREFIX}-1` });
    expect(row.props.accessibilityLabel).toBe("Zone 1, 32:49, <110 bpm");
    expect(
      tree!.root.findByProps({ testID: `${TEST_PREFIX}-1-duration` }).props.children,
    ).toBe("32:49");
    expect(tree!.root.findByProps({ testID: `${TEST_PREFIX}-1-range` }).props.children).toBe(
      "<110 bpm",
    );
  });

  it("renders proportional progress bar fill (minutes/max)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <HrZoneRow
          zoneLabel="Zone 2"
          zoneNumber={2}
          durationLabel="5:00"
          rangeLabel="110–129 bpm"
          minutes={5}
          maxZoneMinutes={10}
          testIDPrefix={TEST_PREFIX}
        />,
      );
    });
    const fill = tree!.root.findByProps({ testID: `${TEST_PREFIX}-2-fill` });
    expect(fill.props.style).toContainEqual({ width: "50%" });
  });

  it("clamps to 100% when minutes ≥ max", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <HrZoneRow
          zoneLabel="Zone 3"
          zoneNumber={3}
          durationLabel="20:00"
          rangeLabel="130–149 bpm"
          minutes={25}
          maxZoneMinutes={20}
          testIDPrefix={TEST_PREFIX}
        />,
      );
    });
    const fill = tree!.root.findByProps({ testID: `${TEST_PREFIX}-3-fill` });
    expect(fill.props.style).toContainEqual({ width: "100%" });
  });

  it("renders empty track (no fill child) when minutes is 0", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <HrZoneRow
          zoneLabel="Zone 5"
          zoneNumber={5}
          durationLabel="0:00"
          rangeLabel="170+ bpm"
          minutes={0}
          maxZoneMinutes={32.816}
          testIDPrefix={TEST_PREFIX}
        />,
      );
    });
    expect(tree!.root.findAllByProps({ testID: `${TEST_PREFIX}-5-fill` })).toHaveLength(0);
    // Duration still rendered (zero is meaningful).
    expect(
      tree!.root.findByProps({ testID: `${TEST_PREFIX}-5-duration` }).props.children,
    ).toBe("0:00");
  });

  it("renders empty track when max is 0 (all-zero tuple)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <HrZoneRow
          zoneLabel="Zone 1"
          zoneNumber={1}
          durationLabel="0:00"
          rangeLabel="<110 bpm"
          minutes={0}
          maxZoneMinutes={0}
          testIDPrefix={TEST_PREFIX}
        />,
      );
    });
    expect(tree!.root.findAllByProps({ testID: `${TEST_PREFIX}-1-fill` })).toHaveLength(0);
  });

  it("renders MISSING_VALUE for duration + 'not available' a11y when durationLabel is null", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <HrZoneRow
          zoneLabel="Zone 2"
          zoneNumber={2}
          durationLabel={null}
          rangeLabel="110–129 bpm"
          minutes={null}
          maxZoneMinutes={0}
          testIDPrefix={TEST_PREFIX}
        />,
      );
    });
    const row = tree!.root.findByProps({ testID: `${TEST_PREFIX}-2` });
    expect(row.props.accessibilityLabel).toBe("Zone 2, not available, 110–129 bpm");
    expect(
      tree!.root.findByProps({ testID: `${TEST_PREFIX}-2-duration` }).props.children,
    ).toBe(HR_ZONE_ROW_MISSING_VALUE);
    expect(tree!.root.findAllByProps({ testID: `${TEST_PREFIX}-2-fill` })).toHaveLength(0);
  });

  it("inner bar/text elements are hidden from accessibility (single composed row label)", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <HrZoneRow
          zoneLabel="Zone 1"
          zoneNumber={1}
          durationLabel="32:49"
          rangeLabel="<110 bpm"
          minutes={32}
          maxZoneMinutes={32}
          testIDPrefix={TEST_PREFIX}
        />,
      );
    });
    const track = tree!.root.findByProps({ testID: `${TEST_PREFIX}-1-track` });
    expect(track.props.accessibilityElementsHidden).toBe(true);
    expect(track.props.importantForAccessibility).toBe("no");
  });
});
