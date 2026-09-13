import {
  HEALTH_PERFORMANCE_CATEGORY_DEFINITIONS,
  buildHealthPerformanceCategoryCards,
} from "../healthPerformanceCategories";

describe("healthPerformanceCategories", () => {
  it("locks exact consumer order and labels", () => {
    expect(HEALTH_PERFORMANCE_CATEGORY_DEFINITIONS.map((d) => d.label)).toEqual([
      "Body Composition",
      "Strength",
      "Cardio Fitness",
      "Nutrition",
      "Sleep",
      "Recovery",
      "Health",
    ]);
    expect(HEALTH_PERFORMANCE_CATEGORY_DEFINITIONS).toHaveLength(7);
  });

  it("does not include Movement, Activity, Body, Cardio, or Health / Labs as primary labels", () => {
    const labels = HEALTH_PERFORMANCE_CATEGORY_DEFINITIONS.map((d) => d.label);
    expect(labels).not.toContain("Movement");
    expect(labels).not.toContain("Activity");
    expect(labels).not.toContain("Body");
    expect(labels).not.toContain("Cardio");
    expect(labels).not.toContain("Health / Labs");
  });

  it("maps each card to one canonical destination", () => {
    expect(HEALTH_PERFORMANCE_CATEGORY_DEFINITIONS.map((d) => d.href)).toEqual([
      "/(app)/body",
      "/(app)/workouts",
      "/(app)/cardio",
      "/(app)/nutrition",
      "/(app)/recovery/sleep",
      "/(app)/recovery",
      "/(app)/labs",
    ]);
  });

  it("builds cards without fabricated scores or guessed statuses by default", () => {
    const cards = buildHealthPerformanceCategoryCards();
    expect(cards).toHaveLength(7);
    for (const card of cards) {
      expect(card.statusLabel).toBeNull();
      expect(card.accessibilityLabel).toBe(card.label);
      expect(card.label).not.toMatch(/Excellent|Great|Good|Fair|Needs Attention|Building baseline/);
      expect(String(card.statusLabel ?? "")).not.toMatch(/^0$|^100$/);
    }
  });
});
