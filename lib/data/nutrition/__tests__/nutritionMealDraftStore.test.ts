import {
  buildEmptyNutritionMealDraft,
  newMealDraftItemId,
  nutritionMealDraftStore,
  type NutritionMealDraftItem,
} from "@/lib/data/nutrition/nutritionMealDraftStore";

function makeItem(id: string, over: Partial<NutritionMealDraftItem> = {}): NutritionMealDraftItem {
  return {
    id,
    label: "Eggs",
    servingLabel: "2 pieces",
    manual: false,
    macros: { caloriesKcal: 140, proteinG: 12, carbsG: 1, fatG: 10, fiberG: 0 },
    ...over,
  };
}

describe("nutritionMealDraftStore", () => {
  beforeEach(() => nutritionMealDraftStore.reset());

  it("starts empty", () => {
    expect(nutritionMealDraftStore.getSnapshot()).toEqual(buildEmptyNutritionMealDraft());
  });

  it("adds, updates, and removes items immutably", () => {
    const before = nutritionMealDraftStore.getSnapshot();
    nutritionMealDraftStore.addItem(makeItem("a"));
    nutritionMealDraftStore.addItem(makeItem("b", { label: "Rice" }));
    const after = nutritionMealDraftStore.getSnapshot();
    expect(after).not.toBe(before);
    expect(after.items.map((i) => i.id)).toEqual(["a", "b"]);

    nutritionMealDraftStore.updateItem("a", { label: "Egg whites" });
    expect(nutritionMealDraftStore.getSnapshot().items[0]?.label).toBe("Egg whites");

    nutritionMealDraftStore.removeItem("a");
    expect(nutritionMealDraftStore.getSnapshot().items.map((i) => i.id)).toEqual(["b"]);
  });

  it("sets the meal name and resets everything", () => {
    nutritionMealDraftStore.setName("Eggs & Rice");
    nutritionMealDraftStore.addItem(makeItem("a"));
    expect(nutritionMealDraftStore.getSnapshot().name).toBe("Eggs & Rice");

    nutritionMealDraftStore.reset();
    expect(nutritionMealDraftStore.getSnapshot()).toEqual({ name: "", items: [] });
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const listener = jest.fn();
    const unsub = nutritionMealDraftStore.subscribe(listener);
    nutritionMealDraftStore.addItem(makeItem("a"));
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    nutritionMealDraftStore.addItem(makeItem("b"));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("generates unique row ids", () => {
    expect(newMealDraftItemId()).not.toBe(newMealDraftItemId());
  });
});
