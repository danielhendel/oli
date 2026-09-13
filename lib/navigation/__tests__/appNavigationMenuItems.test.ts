import {
  APP_NAVIGATION_MENU_SECTIONS,
} from "../appNavigationMenuItems";
import { PRIMARY_NAVIGATION_ITEMS } from "../primaryNavigationConfig";

describe("appNavigationMenuItems", () => {
  it("includes Main, Health & Performance, and Account & Data sections", () => {
    expect(APP_NAVIGATION_MENU_SECTIONS.map((s) => s.title)).toEqual([
      "Main",
      "Health & Performance",
      "Account & Data",
    ]);
  });

  it("Main mirrors the five primary destinations", () => {
    const main = APP_NAVIGATION_MENU_SECTIONS.find((s) => s.id === "main")!;
    expect(main.items.map((i) => i.label)).toEqual(PRIMARY_NAVIGATION_ITEMS.map((i) => i.label));
  });

  it("Health & Performance lists the seven Home categories", () => {
    const health = APP_NAVIGATION_MENU_SECTIONS.find((s) => s.id === "health_performance")!;
    expect(health.items.map((i) => i.label)).toEqual([
      "Body Composition",
      "Strength",
      "Cardio Fitness",
      "Nutrition",
      "Sleep",
      "Recovery",
      "Health",
    ]);
  });

  it("omits debug and placeholder destinations", () => {
    const labels = APP_NAVIGATION_MENU_SECTIONS.flatMap((s) => s.items.map((i) => i.label));
    expect(labels).not.toContain("Command Center");
    expect(labels).not.toContain("Daily Recap");
    expect(labels).not.toContain("Debug Token");
    expect(labels).not.toContain("Coming soon");
  });
});
