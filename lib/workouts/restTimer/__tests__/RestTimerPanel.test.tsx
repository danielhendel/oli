/**
 * Rest timer panel: presets-only setup, tap preset starts timer, tap outside dismisses.
 */

import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  return {
    View: "View",
    Text: "Text",
    TextInput: "TextInput",
    Pressable: "Pressable",
    StyleSheet: { create: (s: unknown) => s },
    PanResponder: { create: jest.fn(() => ({ panHandlers: {} })) },
    Platform: RN.Platform ?? { OS: "ios" },
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const mockSetPanelVisible = jest.fn();
const mockStart = jest.fn();
const mockReset = jest.fn();
const mockStop = jest.fn();

const defaultUseRestTimer = () => ({
  status: "idle",
  remainingMs: 0,
  panelVisible: true,
  lastDurationSec: null,
  start: mockStart,
  pause: jest.fn(),
  resume: jest.fn(),
  reset: mockReset,
  stop: mockStop,
  setPanelVisible: mockSetPanelVisible,
});

jest.mock("../RestTimerContext", () => ({
  useRestTimer: jest.fn(),
}));

function findText(root: renderer.ReactTestRenderer["root"], text: string): renderer.ReactTestInstance | null {
  const texts = root.findAllByType("Text");
  for (const t of texts) {
    const c = t.props.children;
    const str = Array.isArray(c) ? c.join("") : c;
    if (String(str).includes(text)) return t;
  }
  return null;
}

function findByA11yLabel(root: renderer.ReactTestRenderer["root"], label: string): renderer.ReactTestInstance | null {
  const nodes = root.findAllByProps({ accessibilityLabel: label });
  return nodes.length > 0 ? nodes[0] : null;
}

const { useRestTimer } = require("../RestTimerContext") as { useRestTimer: jest.Mock };

describe("RestTimerPanel", () => {
  beforeEach(() => {
    mockSetPanelVisible.mockClear();
    mockStart.mockClear();
    mockReset.mockClear();
    mockStop.mockClear();
    useRestTimer.mockImplementation(defaultUseRestTimer);
  });

  it("setup shows five presets 30s 45s 60s 90s 2m", () => {
    const { RestTimerPanel: Panel } = require("../RestTimerPanel");
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Panel />);
    });
    expect(findText(tree!.root, "30s")).not.toBeNull();
    expect(findText(tree!.root, "45s")).not.toBeNull();
    expect(findText(tree!.root, "60s")).not.toBeNull();
    expect(findText(tree!.root, "90s")).not.toBeNull();
    expect(findText(tree!.root, "2m")).not.toBeNull();
  });

  it("tapping a preset starts the timer immediately", () => {
    const { RestTimerPanel: Panel } = require("../RestTimerPanel");
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Panel />);
    });
    const sixtySec = findByA11yLabel(tree!.root, "60 seconds");
    expect(sixtySec).not.toBeNull();
    act(() => {
      sixtySec!.props.onPress();
    });
    expect(mockStart).toHaveBeenCalledWith(60_000);
  });

  it("tap outside (backdrop) closes panel", () => {
    const { RestTimerPanel: Panel } = require("../RestTimerPanel");
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Panel />);
    });
    const backdrop = findByA11yLabel(tree!.root, "Close timer");
    expect(backdrop).not.toBeNull();
    act(() => {
      backdrop!.props.onPress();
    });
    expect(mockSetPanelVisible).toHaveBeenCalledWith(false);
  });

  it("finished state shows Restart and Stop without completion notification box", () => {
    useRestTimer.mockImplementation(() => ({
      status: "finished",
      remainingMs: 0,
      panelVisible: true,
      lastDurationSec: 60,
      start: mockStart,
      pause: jest.fn(),
      resume: jest.fn(),
      reset: mockReset,
      stop: mockStop,
      setPanelVisible: mockSetPanelVisible,
    }));
    const { RestTimerPanel: Panel } = require("../RestTimerPanel");
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Panel />);
    });
    expect(findByA11yLabel(tree!.root, "Restart same duration")).not.toBeNull();
    expect(findByA11yLabel(tree!.root, "Stop")).not.toBeNull();
    expect(findText(tree!.root, "0:00")).not.toBeNull();
  });

  it("Restart button in finished state calls reset", () => {
    useRestTimer.mockImplementation(() => ({
      status: "finished",
      remainingMs: 0,
      panelVisible: true,
      lastDurationSec: 60,
      start: mockStart,
      pause: jest.fn(),
      resume: jest.fn(),
      reset: mockReset,
      stop: mockStop,
      setPanelVisible: mockSetPanelVisible,
    }));
    const { RestTimerPanel: Panel } = require("../RestTimerPanel");
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Panel />);
    });
    const restart = findByA11yLabel(tree!.root, "Restart same duration");
    act(() => {
      restart!.props.onPress();
    });
    expect(mockReset).toHaveBeenCalled();
  });
});
