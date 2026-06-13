import React from "react";
import renderer, { act } from "react-test-renderer";
import { NutritionSourceBadges } from "@/lib/ui/nutrition/NutritionSourceBadges";

function render(el: React.ReactElement): string {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(el);
  });
  return JSON.stringify(tree!.toJSON());
}

describe("NutritionSourceBadges", () => {
  it("renders a supplement badge for supplements", () => {
    const flat = render(<NutritionSourceBadges productType="supplement" />);
    expect(flat).toContain("Supplement");
  });

  it("renders the source label", () => {
    const flat = render(<NutritionSourceBadges source="open" />);
    expect(flat).toContain("Open Food Facts");
  });

  it("renders the attribution badge when attribution is required", () => {
    const flat = render(<NutritionSourceBadges attributionRequired source="open" />);
    expect(flat).toContain("Data © Open Food Facts");
  });

  it("hides the attribution badge in compact mode", () => {
    const flat = render(<NutritionSourceBadges attributionRequired source="open" compact />);
    expect(flat).not.toContain("Data © Open Food Facts");
    expect(flat).toContain("Open Food Facts");
  });

  it("renders nothing when there is nothing to show", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<NutritionSourceBadges />);
    });
    expect(tree!.toJSON()).toBeNull();
  });
});
