import React, { act } from "react";
import { Dimensions, ScrollView, Text, View } from "react-native";
import renderer from "react-test-renderer";

import { MetricDetailShell } from "@/lib/ui/common/MetricDetailShell";
import {
  METRIC_DETAIL_BODY_END_SPACING,
  METRIC_DETAIL_FOOTER_MIN_HEIGHT,
  METRIC_DETAIL_TOP_CORNER_RADIUS,
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
    // Sheet must not steal the responder from ScrollView pans.
    expect(sheet.props.onStartShouldSetResponder).toBeUndefined();
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

  it("gives ScrollView a flex:1 viewport and keeps Done outside it", () => {
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
          sections={[
            { heading: "What it measures", body: "A".repeat(400) },
            { heading: "How to understand it", body: "B".repeat(400) },
            { heading: "What can help", body: "C".repeat(400) },
          ]}
        />,
      );
    });

    const viewport = tree.root.findByProps({ testID: "metric-detail-shell-body-viewport" });
    const viewportStyle = Array.isArray(viewport.props.style)
      ? Object.assign({}, ...viewport.props.style.filter(Boolean))
      : viewport.props.style;
    expect(viewportStyle.flex).toBe(1);
    expect(viewportStyle.minHeight).toBe(0);

    const scroll = tree.root.findByProps({ testID: "metric-detail-shell-scroll" });
    expect(scroll.type).toBe(ScrollView);
    expect(scroll.props.scrollEnabled).toBe(true);
    expect(scroll.props.showsVerticalScrollIndicator).toBe(false);
    const scrollStyle = Array.isArray(scroll.props.style)
      ? Object.assign({}, ...scroll.props.style.filter(Boolean))
      : scroll.props.style;
    expect(scrollStyle.flex).toBe(1);
    expect(scroll.findAllByType(ScrollView)).toHaveLength(1);

    const contentStyle = scroll.props.contentContainerStyle;
    const flatContent = Array.isArray(contentStyle)
      ? Object.assign({}, ...contentStyle.filter(Boolean))
      : contentStyle;
    expect(flatContent.paddingBottom).toBe(METRIC_DETAIL_BODY_END_SPACING);
    expect(flatContent.flexGrow ?? 0).toBe(0);
    expect(flatContent.height).toBeUndefined();

    const footer = tree.root.findByProps({ testID: "metric-detail-shell-footer" });
    expect(footer.findByProps({ testID: "metric-detail-shell-done" })).toBeDefined();
    expect(scroll.findAllByProps({ testID: "metric-detail-shell-done" })).toHaveLength(0);
    expect(scroll.findByProps({ testID: "metric-detail-shell-data-accuracy" })).toBeDefined();

    // Backdrop is a sibling Pressable, not a parent wrapping the sheet body.
    const backdrop = tree.root.findByProps({ testID: "metric-detail-shell-backdrop" });
    expect(backdrop.parent).not.toBe(scroll.parent);

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

  it("accepts scroll events on the body ScrollView", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <MetricDetailShell
          visible
          onClose={jest.fn()}
          title="Duration"
          heroValue="6h 31m"
          dataAccuracyBody={"Final line. ".repeat(40)}
        />,
      );
    });
    const scroll = tree.root.findByProps({ testID: "metric-detail-shell-scroll" });
    expect(() => {
      act(() => {
        scroll.props.onScroll?.({
          nativeEvent: { contentOffset: { y: 120, x: 0 } },
        });
      });
    }).not.toThrow();
    expect(scroll.props.scrollEnabled).not.toBe(false);
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

  it("does not render header or footer scroll seams", () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <MetricDetailShell visible onClose={jest.fn()} title="Duration" heroValue="6h 31m" />,
      );
    });
    const header = tree.root.findByProps({ testID: "metric-detail-shell-header" });
    const footer = tree.root.findByProps({ testID: "metric-detail-shell-footer" });
    expect(() => header.findByProps({ testID: "metric-detail-shell-header-divider" })).toThrow();
    expect(() => footer.findByProps({ testID: "metric-detail-shell-footer-divider" })).toThrow();
    const headerFlat = Array.isArray(header.props.style)
      ? Object.assign({}, ...header.props.style.filter(Boolean))
      : header.props.style;
    const footerFlat = Array.isArray(footer.props.style)
      ? Object.assign({}, ...footer.props.style.filter(Boolean))
      : footer.props.style;
    expect(headerFlat.borderBottomWidth ?? 0).toBe(0);
    expect(footerFlat.borderTopWidth ?? 0).toBe(0);
    expect(headerFlat.backgroundColor).toBe(footerFlat.backgroundColor);
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
