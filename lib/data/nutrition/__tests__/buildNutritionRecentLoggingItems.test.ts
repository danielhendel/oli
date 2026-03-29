import {
  dedupeRecentLoggingItems,
  recentItemToDraftFields,
  sortRecentLoggingItemsNewestFirst,
  type NutritionRecentLoggingItem,
} from "../buildNutritionRecentLoggingItems";

const mk = (id: string, savedAt: string): NutritionRecentLoggingItem => ({
  id,
  savedAt,
  dayKey: "2026-03-01",
  title: "Day total · 2026-03-01",
  totalKcal: 2000,
  proteinG: 100,
  carbsG: 200,
  fatG: 60,
  fiberG: null,
});

describe("buildNutritionRecentLoggingItems", () => {
  it("sorts newest first", () => {
    const sorted = sortRecentLoggingItemsNewestFirst([mk("a", "2026-01-01"), mk("b", "2026-06-01")]);
    expect(sorted[0]!.id).toBe("b");
  });

  it("dedupes by macro signature keeping newest", () => {
    const d = dedupeRecentLoggingItems([
      mk("old", "2026-01-01"),
      { ...mk("new", "2026-02-01"), id: "new" },
    ]);
    expect(d.length).toBe(1);
    expect(d[0]!.id).toBe("new");
  });

  it("recentItemToDraftFields", () => {
    const draft = recentItemToDraftFields({
      ...mk("x", "2026-01-01"),
      fiberG: 12,
    });
    expect(draft.totalKcal).toBe("2000");
    expect(draft.fiberG).toBe("12");
  });
});
