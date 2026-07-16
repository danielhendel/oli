import React from "react";
import { StyleSheet } from "react-native";
import renderer, { act } from "react-test-renderer";

import { OLI_LIGHT } from "@/lib/ui/theme/oliSemantic";
import { OliThemeProvider } from "@/lib/ui/theme/OliThemeContext";
import { TimelineCalendarButton } from "@/lib/ui/timeline/TimelineCalendarButton";

describe("TimelineCalendarButton", () => {
  function render(mode: "light" | "dark", onPress = jest.fn()) {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <OliThemeProvider mode={mode}>
          <TimelineCalendarButton onPress={onPress} />
        </OliThemeProvider>,
      );
    });
    return { tree, onPress };
  }

  it("resolves the dark-mode glyph to white", () => {
    const { tree } = render("dark");
    const icon = tree.root.findByProps({ testID: "timeline-calendar-icon" });
    expect(icon.props.color).toBe("#FFFFFF");
  });

  it("resolves the light-mode glyph to semantic primary text", () => {
    const { tree } = render("light");
    const icon = tree.root.findByProps({ testID: "timeline-calendar-icon" });
    expect(icon.props.color).toBe(OLI_LIGHT.textPrimary);
  });

  it("has a 44-point target, correct accessibility, pressed feedback, and invokes press", () => {
    const { tree, onPress } = render("dark");
    const button = tree.root.findByProps({ testID: "timeline-calendar-button" });
    const resting = StyleSheet.flatten(button.props.style({ pressed: false }));
    const pressed = StyleSheet.flatten(button.props.style({ pressed: true }));

    expect(resting.minWidth).toBeGreaterThanOrEqual(44);
    expect(resting.minHeight).toBeGreaterThanOrEqual(44);
    expect(resting.opacity).toBe(1);
    expect(pressed.opacity).toBeLessThan(1);
    expect(button.props.accessibilityRole).toBe("button");
    expect(button.props.accessibilityLabel).toBe("Open timeline calendar");

    act(() => button.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
