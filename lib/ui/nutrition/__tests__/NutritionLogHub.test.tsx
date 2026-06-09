import React from "react";
import renderer, { act } from "react-test-renderer";
import { NutritionLogHub } from "@/lib/ui/nutrition/NutritionLogHub";

describe("NutritionLogHub", () => {
  it("renders all logging entry modes", async () => {
    const onSelectMode = jest.fn();
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<NutritionLogHub onSelectMode={onSelectMode} />);
    });
    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain("nutrition-log-hub-search");
    expect(flat).toContain("nutrition-log-hub-kitchen");
    expect(flat).toContain("nutrition-log-hub-meals");
    expect(flat).toContain("nutrition-log-hub-supplements");
    expect(flat).toContain("nutrition-log-hub-manual");
    expect(flat).toContain("nutrition-log-hub-scan");
  });
});
