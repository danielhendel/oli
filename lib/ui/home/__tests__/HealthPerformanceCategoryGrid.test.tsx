import React, { act } from "react";
import renderer from "react-test-renderer";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { HealthPerformanceCategoryGrid } = require("../HealthPerformanceCategoryGrid");

describe("HealthPerformanceCategoryGrid", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders seven full-width stacked cards in approved order", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(HealthPerformanceCategoryGrid));
    });

    const grid = tree.root.findByProps({ testID: "home-health-performance-grid" });
    expect(grid.props.style).toEqual(
      expect.objectContaining({
        width: "100%",
      }),
    );

    const ids = [
      "body_composition",
      "strength",
      "cardio_fitness",
      "nutrition",
      "sleep",
      "recovery",
      "health",
    ];
    const cards = ids.map((id) => tree.root.findByProps({ testID: `home-category-card-${id}` }));
    expect(cards).toHaveLength(7);

    for (const card of cards) {
      const styleProp = card.props.style;
      const resolved =
        typeof styleProp === "function" ? styleProp({ pressed: false }) : styleProp;
      const style = Array.isArray(resolved)
        ? Object.assign({}, ...resolved.filter(Boolean))
        : resolved;
      expect(style).toEqual(expect.objectContaining({ width: "100%" }));
      expect(card.props.accessibilityRole).toBe("button");
    }

    expect(tree.root.findAllByProps({ testID: "home-category-card-activity" })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: "home-category-card-movement" })).toHaveLength(0);
  });

  it("routes a full-row press to the canonical category href", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(React.createElement(HealthPerformanceCategoryGrid));
    });
    const strength = tree.root.findByProps({ testID: "home-category-card-strength" });
    act(() => {
      strength.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith("/(app)/workouts");
  });
});
