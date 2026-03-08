import React from "react";
import renderer, { act } from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../scripts/test/consoleGuard";
import { ExerciseProgressChart } from "../ExerciseProgressChart";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (s: unknown) => s },
}));

jest.mock("react-native-svg", () => ({
  default: "Svg",
  Path: "Path",
  Circle: "Circle",
  Text: "SvgText",
}));

describe("ExerciseProgressChart", () => {
  beforeEach(() => {
    allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
  });

  it("renders placeholder when no points", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ExerciseProgressChart points={[]} />);
    });
    const placeholder = tree!.root.findByProps({ testID: "exercise-progress-chart" });
    expect(placeholder).toBeTruthy();
    const text = tree!.root.findAllByType("Text").find((t) =>
      String(t.props.children).includes("Log more sessions"),
    );
    expect(text).toBeTruthy();
  });

  it("renders placeholder when one point (insufficient for trend)", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExerciseProgressChart points={[{ dateIso: "2026-03-01T10:00:00.000Z", valueKg: 80 }]} />,
      );
    });
    const placeholder = tree!.root.findByProps({ testID: "exercise-progress-chart" });
    expect(placeholder).toBeTruthy();
    const text = tree!.root.findAllByType("Text").find((t) =>
      String(t.props.children).includes("Log more sessions"),
    );
    expect(text).toBeTruthy();
  });

  it("renders chart when showPlaceholder true even with two points", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExerciseProgressChart
          points={[
            { dateIso: "2026-02-28T10:00:00.000Z", valueKg: 70 },
            { dateIso: "2026-03-01T10:00:00.000Z", valueKg: 80 },
          ]}
          showPlaceholder={true}
        />,
      );
    });
    const view = tree!.root.findByProps({ testID: "exercise-progress-chart" });
    expect(view).toBeTruthy();
    const text = tree!.root.findAllByType("Text").find((t) =>
      String(t.props.children).includes("Not enough data"),
    );
    expect(text).toBeTruthy();
  });

  it("renders chart container with two points (usable history)", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExerciseProgressChart
          points={[
            { dateIso: "2026-02-28T10:00:00.000Z", valueKg: 70 },
            { dateIso: "2026-03-01T10:00:00.000Z", valueKg: 80 },
          ]}
        />,
      );
    });
    const view = tree!.root.findByProps({ testID: "exercise-progress-chart" });
    expect(view).toBeTruthy();
  });
});
