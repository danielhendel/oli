import React, { act } from "react";
import fs from "node:fs";
import path from "node:path";
import renderer from "react-test-renderer";

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

import CardioBuilderRoute from "../cardio";
import NutritionBuilderRoute from "../nutrition";
import RecoveryBuilderRoute from "../recovery";

function renderToString(element: React.ReactElement): string {
  let test!: renderer.ReactTestRenderer;
  act(() => {
    test = renderer.create(element);
  });
  return JSON.stringify(test.toJSON());
}

describe("Builder placeholder routes", () => {
  it("renders the Cardio placeholder with its capability preview", () => {
    const str = renderToString(<CardioBuilderRoute />);
    expect(str).toContain("Cardio Builder");
    expect(str).toContain("Coming soon");
    expect(str).toContain("Zone 2");
    expect(str).toContain("VO₂ Max");
    expect(str).toContain("Heart-rate zones");
  });

  it("renders the Nutrition placeholder with its capability preview", () => {
    const str = renderToString(<NutritionBuilderRoute />);
    expect(str).toContain("Nutrition Builder");
    expect(str).toContain("Coming soon");
    expect(str).toContain("Calorie targets");
    expect(str).toContain("Macros by day");
    expect(str).toContain("Hydration");
  });

  it("renders the Recovery placeholder with its capability preview", () => {
    const str = renderToString(<RecoveryBuilderRoute />);
    expect(str).toContain("Recovery Builder");
    expect(str).toContain("Coming soon");
    expect(str).toContain("HRV / RHR readiness");
    expect(str).toContain("Deload rules");
    expect(str).toContain("Recovery score");
  });
});

describe("Program builder route screens", () => {
  it("do not import Firebase / raw HTTP / write logic", () => {
    const dir = path.join(__dirname, "..");
    const files = [
      "cardio.tsx",
      "nutrition.tsx",
      "recovery.tsx",
      "workout/index.tsx",
      "workout/type.tsx",
      "workout/training-level.tsx",
      "workout/duration.tsx",
      "workout/muscle-group-volume.tsx",
      "workout/weekly-split.tsx",
    ];
    for (const file of files) {
      const src = fs.readFileSync(path.join(dir, file), "utf8");
      expect(src).not.toMatch(/\bfetch\s*\(/);
      expect(src).not.toMatch(/from\s+["'][^"']*firebase[^"']*["']/i);
      expect(src).not.toMatch(/from\s+["'][^"']*lib\/api\/http["']/);
      expect(src).not.toMatch(/apiGet[A-Za-z]*\s*\(/);
    }
  });
});
