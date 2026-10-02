import React from "react";
import renderer, { act } from "react-test-renderer";

const mockLogWeight = jest.fn();
const mockLogBodyComposition = jest.fn();
const mockLogWaist = jest.fn();
const mockGetIdToken = jest.fn().mockResolvedValue("token");

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: (...args: unknown[]) => mockGetIdToken(...args),
  }),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: { units: { mass: "lb" } } },
  }),
}));

jest.mock("@/lib/data/profile/useUserProfileMain", () => ({
  useUserProfileMain: () => ({
    state: { status: "ready", profile: null },
  }),
}));

jest.mock("@/lib/data/body/useBodyCompositionInterpretation", () => ({
  resolveUserProfileMainForInterpretation: () => ({
    app: { preferredUnits: { length: "in" } },
  }),
}));

jest.mock("@/lib/api/usersMe", () => ({
  logWeight: (...args: unknown[]) => mockLogWeight(...args),
  logBodyComposition: (...args: unknown[]) => mockLogBodyComposition(...args),
  logWaist: (...args: unknown[]) => mockLogWaist(...args),
}));

jest.mock("@/lib/api/ingest", () => ({
  deleteIngestedRawEventAuthed: jest.fn().mockResolvedValue({ ok: true }),
}));

jest.mock("@/lib/navigation/refreshBus", () => ({
  emitRefresh: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock("@/lib/hooks/useBodyMetricEntryKeyboard", () => ({
  useBodyMetricEntryKeyboard: () => ({ keyboardHeight: 0, keyboardVisible: false }),
}));

jest.mock("@/lib/ui/nutrition/NutritionTimeWheelPicker", () => {
  const ReactLocal = require("react");
  return {
    NutritionTimeWheelPicker: () =>
      ReactLocal.createElement("View", { testID: "nutrition-time-wheel" }),
  };
});

import { BodyMetricManualEntrySheet } from "@/lib/ui/body/BodyMetricManualEntrySheet";

function findInput(
  tree: renderer.ReactTestRenderer,
  metric: string,
): renderer.ReactTestInstance {
  return tree.root.findByProps({ testID: `body-metric-manual-entry-input-${metric}` });
}

describe("BodyMetricManualEntrySheet — metric ownership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogWeight.mockResolvedValue({ ok: true });
    mockLogBodyComposition.mockResolvedValue({ ok: true });
    mockLogWaist.mockResolvedValue({ ok: true });
  });

  it("Weight sheet has Weight only — no Body Fat or Lean Mass fields", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricManualEntrySheet
          visible
          metric="weight"
          onClose={jest.fn()}
          onSaved={jest.fn()}
        />,
      );
      await Promise.resolve();
    });
    expect(tree.root.findByProps({ testID: "body-metric-manual-entry-weight" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-entry-sheet-title" }).props.children).toBe(
      "Log Weight",
    );
    expect(findInput(tree, "weight")).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-manual-entry-unit-lb-weight" })).toBeDefined();
    expect(() =>
      tree.root.findByProps({ testID: "body-metric-manual-entry-input-bodyFat" }),
    ).toThrow();
    expect(() =>
      tree.root.findByProps({ testID: "body-metric-manual-entry-input-leanMass" }),
    ).toThrow();
    expect(tree.root.findAllByProps({ testID: "body-metric-manual-entry-unit-percent" })).toHaveLength(
      0,
    );
  });

  it("Body Fat sheet has Body Fat % only — no Weight or Lean Mass", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricManualEntrySheet
          visible
          metric="bodyFat"
          onClose={jest.fn()}
          onSaved={jest.fn()}
        />,
      );
      await Promise.resolve();
    });
    expect(tree.root.findByProps({ testID: "body-metric-entry-sheet-title" }).props.children).toBe(
      "Log Body Fat",
    );
    expect(findInput(tree, "bodyFat").props.accessibilityLabel).toBe("Body Fat percentage");
    expect(tree.root.findByProps({ testID: "body-metric-manual-entry-unit-percent" })).toBeDefined();
    expect(() =>
      tree.root.findByProps({ testID: "body-metric-manual-entry-unit-lb-bodyFat" }),
    ).toThrow();
    expect(() =>
      tree.root.findByProps({ testID: "body-metric-manual-entry-input-weight" }),
    ).toThrow();
    expect(() =>
      tree.root.findByProps({ testID: "body-metric-manual-entry-input-leanMass" }),
    ).toThrow();
  });

  it("Lean Mass sheet has Lean Mass only — no Weight or Body Fat", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricManualEntrySheet
          visible
          metric="leanMass"
          onClose={jest.fn()}
          onSaved={jest.fn()}
        />,
      );
      await Promise.resolve();
    });
    expect(tree.root.findByProps({ testID: "body-metric-entry-sheet-title" }).props.children).toBe(
      "Log Lean Mass",
    );
    expect(findInput(tree, "leanMass")).toBeDefined();
    expect(
      tree.root.findByProps({ testID: "body-metric-manual-entry-unit-lb-leanMass" }),
    ).toBeDefined();
    expect(() =>
      tree.root.findByProps({ testID: "body-metric-manual-entry-input-weight" }),
    ).toThrow();
    expect(() =>
      tree.root.findByProps({ testID: "body-metric-manual-entry-input-bodyFat" }),
    ).toThrow();
    expect(tree.root.findAllByProps({ testID: "body-metric-manual-entry-unit-percent" })).toHaveLength(
      0,
    );
  });
});

describe("BodyMetricManualEntrySheet — validation and save", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogWeight.mockResolvedValue({ ok: true });
    mockLogBodyComposition.mockResolvedValue({ ok: true });
    mockLogWaist.mockResolvedValue({ ok: true });
  });

  it("Weight: save disabled when empty or <=0; valid lb calls logWeight without bodyFat", async () => {
    const onSaved = jest.fn();
    const onClose = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricManualEntrySheet
          visible
          metric="weight"
          onClose={onClose}
          onSaved={onSaved}
        />,
      );
      await Promise.resolve();
    });
    const save = () => tree.root.findByProps({ testID: "body-metric-entry-sheet-save" });
    expect(save().props.disabled).toBe(true);

    await act(async () => {
      findInput(tree, "weight").props.onChangeText("0");
    });
    expect(save().props.disabled).toBe(true);

    await act(async () => {
      findInput(tree, "weight").props.onChangeText("185.2");
    });
    expect(save().props.disabled).toBe(false);

    await act(async () => {
      save().props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockLogWeight).toHaveBeenCalledTimes(1);
    const payload = mockLogWeight.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.weightKg).toBeCloseTo(84.0074, 2);
    expect(payload).not.toHaveProperty("bodyFatPercent");
    expect(mockLogBodyComposition).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith("weight");
    expect(onClose).toHaveBeenCalled();
  });

  it("Body Fat: rejects >100; valid % calls body_composition ingest", async () => {
    const onSaved = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricManualEntrySheet
          visible
          metric="bodyFat"
          onClose={jest.fn()}
          onSaved={onSaved}
        />,
      );
      await Promise.resolve();
    });
    const save = () => tree.root.findByProps({ testID: "body-metric-entry-sheet-save" });

    await act(async () => {
      findInput(tree, "bodyFat").props.onChangeText("101");
    });
    expect(save().props.disabled).toBe(true);

    await act(async () => {
      findInput(tree, "bodyFat").props.onChangeText("18.5");
    });
    expect(save().props.disabled).toBe(false);

    await act(async () => {
      save().props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockLogBodyComposition).toHaveBeenCalledTimes(1);
    expect(mockLogBodyComposition.mock.calls[0]?.[1]).toBe("bodyFatPercent");
    const payload = mockLogBodyComposition.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.bodyFatPercent).toBe(18.5);
    expect(payload).not.toHaveProperty("weightKg");
    expect(payload).not.toHaveProperty("leanBodyMassKg");
    expect(mockLogWeight).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith("bodyFat");
  });

  it("Lean Mass: valid kg calls leanBodyMassKg body_composition ingest", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricManualEntrySheet
          visible
          metric="leanMass"
          onClose={jest.fn()}
          onSaved={jest.fn()}
        />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      tree.root
        .findByProps({ testID: "body-metric-manual-entry-unit-kg-leanMass" })
        .props.onPress();
      findInput(tree, "leanMass").props.onChangeText("61.2");
    });

    await act(async () => {
      tree.root.findByProps({ testID: "body-metric-entry-sheet-save" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockLogBodyComposition).toHaveBeenCalledTimes(1);
    expect(mockLogBodyComposition.mock.calls[0]?.[1]).toBe("leanBodyMassKg");
    const payload = mockLogBodyComposition.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.leanBodyMassKg).toBeCloseTo(61.2, 3);
    expect(payload).not.toHaveProperty("bodyFatPercent");
    expect(mockLogWeight).not.toHaveBeenCalled();
  });

  it("keeps sheet open with friendly error when ingest fails", async () => {
    mockLogWeight.mockResolvedValueOnce({ ok: false, error: "network boom" });
    const onClose = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricManualEntrySheet
          visible
          metric="weight"
          onClose={onClose}
          onSaved={jest.fn()}
        />,
      );
      await Promise.resolve();
    });
    await act(async () => {
      findInput(tree, "weight").props.onChangeText("180");
    });
    await act(async () => {
      tree.root.findByProps({ testID: "body-metric-entry-sheet-save" }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onClose).not.toHaveBeenCalled();
    const err = tree.root.findByProps({ testID: "body-metric-entry-sheet-error" });
    expect(String(err.props.children)).toMatch(/Couldn't save measurement/);
    expect(String(err.props.children)).not.toMatch(/network boom|Firestore/i);
  });

  it("Waist: rejects <=0; converts inches to cm and calls logWaist with WHO protocol", async () => {
    const onSaved = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricManualEntrySheet
          visible
          metric="waist"
          onClose={jest.fn()}
          onSaved={onSaved}
        />,
      );
      await Promise.resolve();
    });
    expect(tree.root.findByProps({ testID: "body-metric-entry-sheet-title" }).props.children).toBe(
      "Log Waist",
    );
    expect(
      tree.root.findByProps({ testID: "body-metric-manual-entry-how-to-measure" }),
    ).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-manual-entry-measured-at" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-manual-entry-unit-in-waist" })).toBeDefined();

    const save = () => tree.root.findByProps({ testID: "body-metric-entry-sheet-save" });
    await act(async () => {
      findInput(tree, "waist").props.onChangeText("0");
    });
    expect(save().props.disabled).toBe(true);

    await act(async () => {
      findInput(tree, "waist").props.onChangeText("32.5");
    });
    expect(save().props.disabled).toBe(false);

    await act(async () => {
      save().props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockLogWaist).toHaveBeenCalledTimes(1);
    const payload = mockLogWaist.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.waistCircumferenceCm).toBeCloseTo(32.5 * 2.54, 3);
    expect(payload.protocolId).toBe("who_midpoint_v1");
    expect(typeof payload.time).toBe("string");
    expect(mockLogWeight).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith("waist");
  });

  it("shared shell exposes 44pt primary and cancel targets", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricManualEntrySheet
          visible
          metric="bodyFat"
          onClose={jest.fn()}
          onSaved={jest.fn()}
        />,
      );
      await Promise.resolve();
    });
    const save = tree.root.findByProps({ testID: "body-metric-entry-sheet-save" });
    const cancel = tree.root.findByProps({ testID: "body-metric-entry-sheet-cancel" });
    const rawStyle =
      typeof save.props.style === "function"
        ? save.props.style({ pressed: false })
        : save.props.style;
    const saveStyle = Array.isArray(rawStyle)
      ? Object.assign({}, ...rawStyle.filter(Boolean))
      : rawStyle;
    expect(saveStyle.minHeight).toBeGreaterThanOrEqual(44);
    expect(cancel.props.accessibilityLabel).toBe("Cancel");
  });
});
