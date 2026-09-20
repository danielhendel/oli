import React from "react";
import renderer, { act } from "react-test-renderer";

const mockReset = jest.fn();
const mockUpdateEntry = jest.fn();
const mockLogWeight = jest.fn();

jest.mock("@/lib/hooks/useBodyWeightLogMutations", () => ({
  useBodyWeightLogMutations: () => ({
    updateEntry: mockUpdateEntry,
    reset: mockReset,
    errorMessage: null,
    isBusy: false,
  }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    initializing: false,
    getIdToken: jest.fn().mockResolvedValue("token"),
  }),
}));

jest.mock("@/lib/preferences/PreferencesProvider", () => ({
  usePreferences: () => ({
    state: { preferences: { units: { mass: "lb" } } },
  }),
}));

jest.mock("@/lib/api/usersMe", () => ({
  logWeight: (...args: unknown[]) => mockLogWeight(...args),
  logBodyComposition: jest.fn(),
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

import { WeightLogModal } from "@/lib/ui/WeightLogModal";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

describe("WeightLogModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateEntry.mockResolvedValue({ ok: true });
    mockLogWeight.mockResolvedValue({ ok: true });
  });

  it("does not loop updates when rendered closed", async () => {
    await act(async () => {
      renderer.create(
        <WeightLogModal visible={false} onClose={jest.fn()} onSaved={jest.fn()} />,
      );
      await Promise.resolve();
    });
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("resets mutation state once when closing after open", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightLogModal visible onClose={jest.fn()} onSaved={jest.fn()} />,
      );
      await Promise.resolve();
    });
    mockReset.mockClear();
    await act(async () => {
      tree.update(<WeightLogModal visible={false} onClose={jest.fn()} onSaved={jest.fn()} />);
      await Promise.resolve();
    });
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("initializes weight from edit target and omits Body Fat field", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightLogModal
          visible
          onClose={jest.fn()}
          onSaved={jest.fn()}
          editTarget={{
            rawEventId: "w1",
            observedAtIso: "2026-06-06T14:30:00.000Z",
            weightKg: 72.8931,
            bodyFatPercent: 18.5,
          }}
        />,
      );
      await Promise.resolve();
    });
    const inputs = tree.root.findAllByType(require("react-native").TextInput as React.ComponentType);
    const weightInput = inputs.find((node) => node.props.accessibilityLabel === "Weight");
    expect(weightInput?.props.value).toBe("160.7");
    const bfInput = inputs.find(
      (node) => node.props.accessibilityLabel === "Body fat percentage",
    );
    expect(bfInput).toBeUndefined();
    expect(tree.root.findAllByProps({ children: "Body fat % (optional)" })).toHaveLength(0);
  });

  it("uses dark-theme readable text tokens on the premium sheet shell", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightLogModal visible onClose={jest.fn()} onSaved={jest.fn()} />,
      );
      await Promise.resolve();
    });
    expect(tree.root.findByProps({ testID: "body-metric-entry-sheet-panel" })).toBeDefined();
    expect(UI_TEXT_PRIMARY).toBe("#F7F8FA");
    expect(UI_TEXT_SECONDARY).toBe("#A7AFBC");
    expect(UI_TEXT_MUTED).toBe("#6F7785");

    const labels = tree.root.findAllByType("Text");
    const weightLabel = labels.find(
      (n) => Array.isArray(n.children) && n.children.includes("Weight"),
    );
    expect(weightLabel?.props.style.color).toBe(UI_TEXT_SECONDARY);

    const cancel = labels.find(
      (n) => Array.isArray(n.children) && n.children.includes("Cancel"),
    );
    expect(cancel?.props.style.color).toBe(UI_TEXT_SECONDARY);

    const inputs = tree.root.findAllByType(require("react-native").TextInput as React.ComponentType);
    const weightInput = inputs.find((node) => node.props.accessibilityLabel === "Weight");
    expect(weightInput?.props.placeholderTextColor).toBe(UI_TEXT_MUTED);
    const inputStyle = Array.isArray(weightInput?.props.style)
      ? Object.assign({}, ...weightInput!.props.style)
      : weightInput?.props.style;
    expect(inputStyle.color).toBe(UI_TEXT_PRIMARY);
  });

  it("disables save until weight is valid", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeightLogModal visible onClose={jest.fn()} onSaved={jest.fn()} />,
      );
      await Promise.resolve();
    });
    const save = tree.root.findByProps({ testID: "body-metric-entry-sheet-save" });
    expect(save.props.disabled).toBe(true);
  });
});
