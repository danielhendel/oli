import React from "react";
import renderer, { act } from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../scripts/test/consoleGuard";
import { ExerciseMediaThumbnail } from "../ExerciseMediaThumbnail";

jest.mock("react-native", () => {
  return {
    View: "View",
    Image: "Image",
    StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: function IoniconsMock({ name }: { name?: string }) {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View, { testID: `mock-ionicon-${name ?? "none"}` });
  },
}));

function flattenStyle(style: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const parts = Array.isArray(style) ? style : [style];
  for (const p of parts) {
    if (p != null && typeof p === "object") Object.assign(out, p as object);
  }
  return out;
}

describe("ExerciseMediaThumbnail", () => {
  beforeEach(() => {
    allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
  });

  it("uses resizeMode contain for remote imageUrl", async () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExerciseMediaThumbnail
          size="row"
          imageUrl="https://cdn.example/equipment.png"
          accessibilityLabel="Test lift"
        />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    const img = tree.root.findAllByType("Image")[0]!;
    expect(img.props.resizeMode).toBe("contain");
    expect(img.props.source.uri).toBe("https://cdn.example/equipment.png");
    act(() => tree.unmount());
  });

  it("uses resizeMode contain for bundled numeric source", async () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExerciseMediaThumbnail size="row" bundledSource={42} accessibilityLabel="Bundled" />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    const img = tree.root.findAllByType("Image")[0]!;
    expect(img.props.resizeMode).toBe("contain");
    expect(img.props.source).toBe(42);
    act(() => tree.unmount());
  });

  it("uses white frame surface for real remote images (not gray slab)", async () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExerciseMediaThumbnail
          size="row"
          imageUrl="https://cdn.example/x.png"
          accessibilityLabel="Lift"
        />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    const root = tree.root.findByProps({ testID: "ExerciseMediaThumbnail" });
    expect(flattenStyle(root.props.style).backgroundColor).toBe("#FFFFFF");
    act(() => tree.unmount());
  });

  it("uses neutral placeholder surface when there is no media", async () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ExerciseMediaThumbnail size="row" accessibilityLabel="Empty" />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    const root = tree.root.findByProps({ testID: "ExerciseMediaThumbnail" });
    expect(flattenStyle(root.props.style).backgroundColor).toBe("#FFFFFF");
    expect(tree.root.findAllByProps({ testID: "ExerciseMediaThumbnailPlaceholder" }).length).toBe(1);
    expect(tree.root.findByProps({ testID: "mock-ionicon-add" })).toBeTruthy();
    act(() => tree.unmount());
  });

  it("falls back to plus placeholder when remote Image fires onError (no lingering Image)", async () => {
    const onLoadError = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExerciseMediaThumbnail
          size="row"
          imageUrl="https://cdn.example/broken.png"
          accessibilityLabel="Broken"
          onLoadError={onLoadError}
        />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    const img = tree.root.findByType("Image");
    act(() => {
      img.props.onError?.({} as never);
    });
    expect(onLoadError).toHaveBeenCalled();
    expect(tree.root.findAllByType("Image").length).toBe(0);
    expect(tree.root.findAllByProps({ testID: "ExerciseMediaThumbnailPlaceholder" }).length).toBe(1);
    act(() => tree.unmount());
  });
});
