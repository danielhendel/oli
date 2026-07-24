import React, { act } from "react";
import { Dimensions, ScrollView, Text, View } from "react-native";
import renderer from "react-test-renderer";

import { MetricDetailShell } from "@/lib/ui/common/MetricDetailShell";
import {
  METRIC_DETAIL_FOOTER_MIN_HEIGHT,
  METRIC_DETAIL_TOP_CORNER_RADIUS,
  metricDetailBodyBottomInset,
  metricDetailSheetHeight,
} from "@/lib/ui/common/metricDetailShellLayout";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

describe("MetricDetailShell layout", () => {
  it("uses near-full-screen height with rounded top corners only", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <MetricDetailShell
          visible
          onClose={jest.fn()}
          title="Duration"
          heroValue="6h 31m"
          dataAccuracyBody="Wearable estimate. Missing nights omitted."
          sections={[{ heading: "What it measures", body: "Estimated asleep time." }]}
        />,
      );
    });

    const sheet = tree.root.findByProps({ testID: "metric-detail-shell-sheet" });
    const windowHeight = Dimensions.get("window").height;
    const expectedHeight = metricDetailSheetHeight({
      windowHeight,
      topSafeArea: 47,
    });
    const flat = Array.isArray(sheet.props.style)
      ? Object.assign({}, ...sheet.props.style.filter(Boolean))
      : sheet.props.style;
    expect(flat.height).toBe(expectedHeight);
    expect(flat.maxHeight).toBeUndefined();
    expect(flat.borderTopLeftRadius).toBe(METRIC_DETAIL_TOP_CORNER_RADIUS);
    expect(flat.borderTopRightRadius).toBe(METRIC_DETAIL_TOP_CORNER_RADIUS);
    expect(flat.borderBottomLeftRadius ?? 0).toBe(0);
    expect(flat.borderBottomRightRadius ?? 0).toBe(0);
  });

  it("keeps title and Close outside the body ScrollView", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <MetricDetailShell visible onClose={jest.fn()} title="Duration" heroValue="6h 31m" />,
      );
    });

    const header = tree.root.findByProps({ testID: "metric-detail-shell-header" });
    const scroll = tree.root.findByProps({ testID: "metric-detail-shell-scroll" });
    expect(header.findAllByType(Text).some((t) => t.props.children === "Duration")).toBe(true);
    expect(tree.root.findByProps({ testID: "metric-detail-shell-close" })).toBeDefined();
    expect(scroll.findAllByType(Text).some((t) => t.props.children === "Duration")).toBe(false);
    expect(scroll.findAllByType(Text).some((t) => t.props.children === "6h 31m")).toBe(true);
  });

  it("keeps Done outside ScrollView with footer clearance padding on body", () => {
    const onClose = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <MetricDetailShell
          visible
          onClose={onClose}
          title="Duration"
          heroValue="6h 31m"
          dataAccuracyBody="Final accuracy line."
        />,
      );
    });

    const scroll = tree.root.findByProps({ testID: "metric-detail-shell-scroll" });
    expect(scroll.type).toBe(ScrollView);
    const nestedScroll = scroll.findAllByType(ScrollView);
    expect(nestedScroll).toHaveLength(1);

    const footer = tree.root.findByProps({ testID: "metric-detail-shell-footer" });
    expect(footer.findByProps({ testID: "metric-detail-shell-done" })).toBeDefined();
    expect(scroll.findAllByProps({ testID: "metric-detail-shell-done" })).toHaveLength(0);

    const chrome = footer.findAllByType(View).find((v) => typeof v.props.onLayout === "function");
    expect(chrome).toBeDefined();

    act(() => {
      chrome!.props.onLayout?.({
        nativeEvent: { layout: { height: METRIC_DETAIL_FOOTER_MIN_HEIGHT + 8, width: 350, x: 0, y: 0 } },
      });
    });

    const updatedScroll = tree.root.findByProps({ testID: "metric-detail-shell-scroll" });
    const contentStyle = updatedScroll.props.contentContainerStyle;
    const flat = Array.isArray(contentStyle)
      ? Object.assign({}, ...contentStyle.filter(Boolean))
      : contentStyle;
    expect(flat.paddingBottom).toBe(
      metricDetailBodyBottomInset({
        footerHeight: METRIC_DETAIL_FOOTER_MIN_HEIGHT + 8,
        bottomSafeArea: 34,
      }),
    );

    const done = tree.root.findByProps({ testID: "metric-detail-shell-done" });
    const doneFlat = (() => {
      const style = done.props.style;
      if (typeof style === "function") {
        const resolved = style({ pressed: false });
        return Array.isArray(resolved)
          ? Object.assign({}, ...resolved.filter(Boolean))
          : resolved;
      }
      return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    })();
    expect(doneFlat.minHeight).toBeGreaterThanOrEqual(METRIC_DETAIL_FOOTER_MIN_HEIGHT);

    act(() => {
      done.props.onPress();
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("dismisses via Close and backdrop", () => {
    const onClose = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <MetricDetailShell visible onClose={onClose} title="Duration" heroValue="6h 31m" />,
      );
    });
    act(() => {
      tree.root.findByProps({ testID: "metric-detail-shell-close" }).props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => {
      tree.root.findByProps({ testID: "metric-detail-shell-backdrop" }).props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("wires Android onRequestClose to dismiss", () => {
    const onClose = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <MetricDetailShell visible onClose={onClose} title="Duration" heroValue="6h 31m" />,
      );
    });
    const modal = tree.root.findByProps({ testID: "metric-detail-shell" });
    act(() => {
      modal.props.onRequestClose();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("places Data & Accuracy inside the scroll body", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <MetricDetailShell
          visible
          onClose={jest.fn()}
          title="Duration"
          heroValue="6h 31m"
          dataAccuracyBody="Wearable estimate."
        />,
      );
    });
    const scroll = tree.root.findByProps({ testID: "metric-detail-shell-scroll" });
    expect(scroll.findByProps({ testID: "metric-detail-shell-data-accuracy" })).toBeDefined();
  });

  it("exposes modal semantics and Close/Done labels", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <MetricDetailShell visible onClose={jest.fn()} title="Duration" heroValue="6h 31m" />,
      );
    });
    const modalRoot = tree.root.findAllByType(View).find((v) => v.props.accessibilityViewIsModal);
    expect(modalRoot?.props.accessibilityViewIsModal).toBe(true);
    const close = tree.root.findByProps({ testID: "metric-detail-shell-close" });
    expect(close.props.accessibilityLabel).toBe("Close");
    expect(tree.root.findByProps({ testID: "metric-detail-shell-done" }).props.accessibilityLabel).toBe(
      "Done",
    );
    const closeStyle =
      typeof close.props.style === "function"
        ? close.props.style({ pressed: false })
        : close.props.style;
    const flatClose = Array.isArray(closeStyle)
      ? Object.assign({}, ...closeStyle.filter(Boolean))
      : closeStyle;
    expect(flatClose.minHeight).toBeGreaterThanOrEqual(44);
    expect(flatClose.minWidth).toBeGreaterThanOrEqual(44);
  });
});
