import React from "react";
import { StyleSheet } from "react-native";
import renderer, { act } from "react-test-renderer";

import { TimelineDaySectionHeader } from "@/lib/ui/timeline/TimelineDaySectionHeader";
import { OLI_DARK, OLI_LIGHT } from "@/lib/ui/theme/oliSemantic";
import { OliThemeProvider } from "@/lib/ui/theme/OliThemeContext";

describe("TimelineDaySectionHeader", () => {
  function render(mode: "light" | "dark", dayKey = "2026-07-16", today = "2026-07-16") {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <OliThemeProvider mode={mode}>
          <TimelineDaySectionHeader dayKey={dayKey} todayDayKey={today} sticky />
        </OliThemeProvider>,
      );
    });
    return tree;
  }

  it.each([
    ["dark", OLI_DARK.textPrimary, OLI_DARK.appScreenBg],
    ["light", OLI_LIGHT.textPrimary, OLI_LIGHT.appScreenBg],
  ] as const)("uses one compact primary Text style in %s mode", (mode, primary, bg) => {
    const tree = render(mode, "2026-07-16", "2026-07-16");
    const header = tree.root.find(
      (n) =>
        n.props?.testID === "timeline-day-section-header" &&
        n.props?.accessibilityRole === "header",
    );
    expect(header.props.accessibilityRole).toBe("header");
    expect(header.props.accessibilityLabel).toBe("Today, July 16, 2026");
    expect(header.props.accessibilityRole).not.toBe("button");

    const wrapStyle = StyleSheet.flatten(header.props.style);
    expect(wrapStyle.backgroundColor).toBe(bg);
    expect(wrapStyle.alignItems).toBe("center");

    const texts = header.findAllByType("Text" as never);
    expect(texts).toHaveLength(1);
    const style = StyleSheet.flatten(texts[0]!.props.style);
    expect(style.color).toBe(primary);
    expect(style.fontSize).toBe(17);
    expect(style.fontWeight).toBe("600");
    expect(texts[0]!.props.accessible).toBe(false);
    expect(texts[0]!.props.allowFontScaling).toBe(true);
    expect(texts[0]!.children).toContain("Today July 16, 2026");
  });

  it("renders historical abbreviated weekday on one line", () => {
    const tree = render("dark", "2026-07-15", "2026-07-16");
    const header = tree.root.find(
      (n) =>
        n.props?.testID === "timeline-day-section-header" &&
        n.props?.accessibilityRole === "header",
    );
    expect(header.props.accessibilityLabel).toBe("Wednesday, July 15, 2026");
    const texts = header.findAllByType("Text" as never);
    expect(texts).toHaveLength(1);
    expect(texts[0]!.children).toContain("Wed July 15, 2026");
    expect(header.props.disabled).toBeUndefined();
  });
});
