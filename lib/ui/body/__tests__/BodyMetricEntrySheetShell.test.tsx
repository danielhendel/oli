import React from "react";
import renderer, { act } from "react-test-renderer";
import { Dimensions, Keyboard } from "react-native";

const mockKeyboardState = jest.fn(() => ({ keyboardHeight: 0, keyboardVisible: false }));

jest.mock("@/lib/hooks/useBodyMetricEntryKeyboard", () => ({
  useBodyMetricEntryKeyboard: (enabled: boolean) => mockKeyboardState(enabled),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

import { BodyMetricEntrySheetShell } from "@/lib/ui/body/BodyMetricEntrySheetShell";

function panelStyle(tree: renderer.ReactTestRenderer): Record<string, unknown> {
  const panel = tree.root.findByProps({ testID: "body-metric-entry-sheet-panel" });
  return Array.isArray(panel.props.style)
    ? Object.assign({}, ...panel.props.style.filter(Boolean))
    : panel.props.style;
}

describe("BodyMetricEntrySheetShell — keyboard / safe-area states", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKeyboardState.mockReturnValue({ keyboardHeight: 0, keyboardVisible: false });
    jest.spyOn(Dimensions, "get").mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1,
    });
    jest.spyOn(Keyboard, "dismiss").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("resting: compact content sheet with safe-area padding once", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricEntrySheetShell
          visible
          title="Log Body Fat"
          onClose={jest.fn()}
          onSave={jest.fn()}
          canSave={false}
          saving={false}
        >
          <></>
        </BodyMetricEntrySheetShell>,
      );
      await Promise.resolve();
    });

    const panel = tree.root.findByProps({ testID: "body-metric-entry-sheet-panel" });
    expect(panel.props.accessibilityHint).toBe("keyboard-resting");
    const style = panelStyle(tree);
    expect(style.paddingBottom).toBe(34);
    expect(style.maxHeight).toBeUndefined();
    expect(tree.root.findByProps({ testID: "body-metric-entry-sheet-title" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-entry-sheet-save" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-entry-sheet-cancel" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-entry-sheet-scroll" })).toBeDefined();
    expect(mockKeyboardState).toHaveBeenCalledWith(true);
  });

  it("editing: keyboard height applied once without stacking safe area", async () => {
    mockKeyboardState.mockReturnValue({ keyboardHeight: 336, keyboardVisible: true });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricEntrySheetShell
          visible
          title="Log Weight"
          onClose={jest.fn()}
          onSave={jest.fn()}
          canSave
          saving={false}
        >
          <></>
        </BodyMetricEntrySheetShell>,
      );
      await Promise.resolve();
    });

    const panel = tree.root.findByProps({ testID: "body-metric-entry-sheet-panel" });
    expect(panel.props.accessibilityHint).toBe("keyboard-editing");
    const style = panelStyle(tree);
    expect(style.paddingBottom).toBe(336);
    expect(style.paddingBottom).not.toBe(336 + 34);
    expect(style.maxHeight).toBe(844 - 336 - 16);
    expect(tree.root.findByProps({ testID: "body-metric-entry-sheet-title" })).toBeDefined();
    expect(tree.root.findByProps({ testID: "body-metric-entry-sheet-save" })).toBeDefined();
  });

  it("keyboard hide restores resting compact padding", async () => {
    mockKeyboardState.mockReturnValue({ keyboardHeight: 300, keyboardVisible: true });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricEntrySheetShell
          visible
          title="Log Lean Mass"
          onClose={jest.fn()}
          onSave={jest.fn()}
          canSave={false}
          saving={false}
        >
          <></>
        </BodyMetricEntrySheetShell>,
      );
      await Promise.resolve();
    });

    mockKeyboardState.mockReturnValue({ keyboardHeight: 0, keyboardVisible: false });
    await act(async () => {
      tree.update(
        <BodyMetricEntrySheetShell
          visible
          title="Log Lean Mass"
          onClose={jest.fn()}
          onSave={jest.fn()}
          canSave={false}
          saving={false}
        >
          <></>
        </BodyMetricEntrySheetShell>,
      );
      await Promise.resolve();
    });

    const panel = tree.root.findByProps({ testID: "body-metric-entry-sheet-panel" });
    expect(panel.props.accessibilityHint).toBe("keyboard-resting");
    const style = panelStyle(tree);
    expect(style.paddingBottom).toBe(34);
    expect(style.maxHeight).toBeUndefined();
  });

  it("reopening after close starts in resting state", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricEntrySheetShell
          visible={false}
          title="Log Weight"
          onClose={jest.fn()}
          onSave={jest.fn()}
          canSave={false}
          saving={false}
        >
          <></>
        </BodyMetricEntrySheetShell>,
      );
      await Promise.resolve();
    });
    await act(async () => {
      tree.update(
        <BodyMetricEntrySheetShell
          visible
          title="Log Weight"
          onClose={jest.fn()}
          onSave={jest.fn()}
          canSave={false}
          saving={false}
        >
          <></>
        </BodyMetricEntrySheetShell>,
      );
      await Promise.resolve();
    });
    expect(panelStyle(tree).maxHeight).toBeUndefined();
    expect(panelStyle(tree).paddingBottom).toBe(34);
  });

  it("calls onPresented after modal show for autofocus coordination", async () => {
    const onPresented = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricEntrySheetShell
          visible
          title="Log Weight"
          onClose={jest.fn()}
          onSave={jest.fn()}
          canSave={false}
          saving={false}
          onPresented={onPresented}
        >
          <></>
        </BodyMetricEntrySheetShell>,
      );
      await Promise.resolve();
    });
    await act(async () => {
      const modal = tree.root.findByType(require("react-native").Modal as React.ComponentType);
      modal.props.onShow?.();
      await Promise.resolve();
    });
    expect(onPresented).toHaveBeenCalledTimes(1);
  });

  it("Cancel dismisses keyboard before closing", async () => {
    const onClose = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricEntrySheetShell
          visible
          title="Log Body Fat"
          onClose={onClose}
          onSave={jest.fn()}
          canSave={false}
          saving={false}
        >
          <></>
        </BodyMetricEntrySheetShell>,
      );
      await Promise.resolve();
    });
    await act(async () => {
      tree.root.findByProps({ testID: "body-metric-entry-sheet-cancel" }).props.onPress();
    });
    expect(Keyboard.dismiss).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("Save and Cancel live inside the scroll content for constrained-height reachability", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <BodyMetricEntrySheetShell
          visible
          title="Log Body Fat"
          onClose={jest.fn()}
          onSave={jest.fn()}
          canSave={false}
          saving={false}
        >
          <></>
        </BodyMetricEntrySheetShell>,
      );
      await Promise.resolve();
    });
    const scroll = tree.root.findByProps({ testID: "body-metric-entry-sheet-scroll" });
    expect(scroll.findByProps({ testID: "body-metric-entry-sheet-save" })).toBeDefined();
    expect(scroll.findByProps({ testID: "body-metric-entry-sheet-cancel" })).toBeDefined();
    expect(scroll.findByProps({ testID: "body-metric-entry-sheet-title" })).toBeDefined();
  });
});
