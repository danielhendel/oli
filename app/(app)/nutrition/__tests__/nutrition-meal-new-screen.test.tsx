import React from "react";
import renderer, { act } from "react-test-renderer";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, dismissTo: mockDismissTo, back: jest.fn() }),
  useLocalSearchParams: () => ({ day: "2026-03-15", fresh: "1" }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

const mockCreateMeal = jest.fn().mockResolvedValue(true);
jest.mock("@/lib/hooks/useNutritionMeals", () => ({
  useNutritionMeals: () => ({
    items: [],
    loading: false,
    errorMessage: null,
    refresh: jest.fn(),
    createMeal: mockCreateMeal,
    removeMeal: jest.fn(),
  }),
}));

const mockLogComposed = jest.fn().mockResolvedValue({ ok: true });
jest.mock("@/lib/hooks/useLogComposedMeal", () => ({
  useLogComposedMeal: () => ({
    status: "idle",
    errorMessage: null,
    queuedOffline: false,
    log: mockLogComposed,
    reset: jest.fn(),
  }),
}));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: "success" },
}));

import NutritionMealNewScreen from "../meal/new";
import { nutritionMealDraftStore } from "@/lib/data/nutrition/nutritionMealDraftStore";

function findAllByTestIdPrefix(tree: renderer.ReactTestRenderer, prefix: string) {
  return tree.root.findAll(
    (n) => typeof n.props.testID === "string" && n.props.testID.startsWith(prefix),
    { deep: true },
  );
}

let currentTree: renderer.ReactTestRenderer | null = null;

async function render(): Promise<renderer.ReactTestRenderer> {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<NutritionMealNewScreen />);
    await Promise.resolve();
  });
  currentTree = tree;
  return tree;
}

async function press(node: { props: { onPress?: (...a: unknown[]) => void } }) {
  await act(async () => {
    node.props.onPress?.();
    await Promise.resolve();
  });
}

async function type(node: { props: { onChangeText?: (t: string) => void } }, text: string) {
  await act(async () => {
    node.props.onChangeText?.(text);
    await Promise.resolve();
  });
}

describe("NutritionMealNewScreen — Add item meal builder", () => {
  beforeEach(() => {
    nutritionMealDraftStore.reset();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockDismissTo.mockClear();
    mockCreateMeal.mockClear();
    mockLogComposed.mockClear();
  });

  afterEach(() => {
    if (currentTree != null) {
      const t = currentTree;
      act(() => {
        t.unmount();
      });
      currentTree = null;
    }
  });

  it("starts empty — Add item does not create a blank manual row", async () => {
    const tree = await render();
    expect(tree.root.findByProps({ testID: "meal-items-empty" })).toBeTruthy();

    await press(tree.root.findByProps({ testID: "meal-add-item" }));
    // Still no item rows after opening the chooser.
    expect(findAllByTestIdPrefix(tree, "meal-item-").filter((n) => /^meal-item-[^-]/.test(String(n.props.testID)))).toHaveLength(0);
    expect(nutritionMealDraftStore.getSnapshot().items).toHaveLength(0);
  });

  it("renders all chooser options", async () => {
    const tree = await render();
    await press(tree.root.findByProps({ testID: "meal-add-item" }));
    for (const mode of ["search", "kitchen", "meals", "supplements", "manual", "scan"]) {
      expect(tree.root.findByProps({ testID: `nutrition-log-hub-${mode}` })).toBeTruthy();
    }
  });

  it("routes Search with meal-draft mode and selected day", async () => {
    const tree = await render();
    await press(tree.root.findByProps({ testID: "meal-add-item" }));
    await press(tree.root.findByProps({ testID: "nutrition-log-hub-search" }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(app)/nutrition/search",
      params: { day: "2026-03-15", mode: "mealDraft" },
    });
  });

  it("adds a manual item to the draft and updates totals live; remove clears it", async () => {
    const tree = await render();
    await press(tree.root.findByProps({ testID: "meal-add-item" }));
    await press(tree.root.findByProps({ testID: "nutrition-log-hub-manual" }));

    await type(tree.root.findByProps({ testID: "manual-item-label" }), "Protein shake");
    await type(tree.root.findByProps({ testID: "manual-item-calories" }), "200");
    await type(tree.root.findByProps({ testID: "manual-item-protein" }), "40");
    await press(tree.root.findByProps({ testID: "manual-item-add" }));

    expect(nutritionMealDraftStore.getSnapshot().items).toHaveLength(1);
    const itemId = nutritionMealDraftStore.getSnapshot().items[0]!.id;
    const subtotal = tree.root.findByProps({ testID: "meal-subtotal" });
    expect(String(subtotal.props.children[0])).toContain("200 kcal");

    const removeBtns = tree.root.findAll(
      (n) => n.props.testID === `meal-item-remove-${itemId}` && typeof n.props.onPress === "function",
    );
    expect(removeBtns.length).toBeGreaterThanOrEqual(1);
    await press(removeBtns[0]!);
    expect(nutritionMealDraftStore.getSnapshot().items).toHaveLength(0);
  });

  it("logs the composed meal to the selected day", async () => {
    const tree = await render();
    await press(tree.root.findByProps({ testID: "meal-add-item" }));
    await press(tree.root.findByProps({ testID: "nutrition-log-hub-manual" }));
    await type(tree.root.findByProps({ testID: "manual-item-calories" }), "300");
    await press(tree.root.findByProps({ testID: "manual-item-add" }));
    expect(nutritionMealDraftStore.getSnapshot().items).toHaveLength(1);

    await press(tree.root.findByProps({ testID: "meal-add-to-day" }));
    expect(mockLogComposed).toHaveBeenCalledWith(
      expect.objectContaining({ dayKey: "2026-03-15", itemCount: 1 }),
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(app)/nutrition",
      params: { logged: "1", day: "2026-03-15" },
    });
  });

  it("saves a reusable meal from the draft items", async () => {
    const tree = await render();
    await type(tree.root.findByProps({ testID: "meal-name-input" }), "Eggs & Rice");
    await press(tree.root.findByProps({ testID: "meal-add-item" }));
    await press(tree.root.findByProps({ testID: "nutrition-log-hub-manual" }));
    await type(tree.root.findByProps({ testID: "manual-item-calories" }), "140");
    await press(tree.root.findByProps({ testID: "manual-item-add" }));

    await press(tree.root.findByProps({ testID: "meal-save-button" }));
    expect(mockCreateMeal).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Eggs & Rice" }),
    );
    const arg = mockCreateMeal.mock.calls[0]![0] as { items: unknown[] };
    expect(arg.items).toHaveLength(1);
  });
});
