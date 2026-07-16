import React from "react";
import { StyleSheet } from "react-native";
import renderer, { act } from "react-test-renderer";

import { OLI_DARK, OLI_LIGHT } from "@/lib/ui/theme/oliSemantic";
import { OliThemeProvider } from "@/lib/ui/theme/OliThemeContext";
import { useModuleCalendarYearNavigationHeader } from "@/lib/ui/calendar/useModuleCalendarYearNavigationHeader";

function Probe({
  navigation,
}: {
  navigation: { setOptions: jest.Mock; goBack: jest.Mock };
}) {
  useModuleCalendarYearNavigationHeader(navigation, 2026);
  return null;
}

describe("module calendar year heading theme", () => {
  it.each([
    ["dark", OLI_DARK.textPrimary],
    ["light", OLI_LIGHT.textPrimary],
  ] as const)("uses semantic primary year text in %s mode", (mode, expected) => {
    const navigation = { setOptions: jest.fn(), goBack: jest.fn() };
    act(() => {
      renderer.create(
        <OliThemeProvider mode={mode}>
          <Probe navigation={navigation} />
        </OliThemeProvider>,
      );
    });

    const options = navigation.setOptions.mock.calls.at(-1)?.[0];
    expect(options.headerTintColor).toBe(expected);
    let titleTree!: renderer.ReactTestRenderer;
    act(() => {
      titleTree = renderer.create(options.headerTitle());
    });
    const text = titleTree.root.findByType("Text" as never);
    const style = StyleSheet.flatten(text.props.style);
    expect(style.color).toBe(expected);
    expect(style.opacity ?? 1).toBe(1);
    expect(text.props.accessibilityRole).toBe("header");
    act(() => titleTree.unmount());
  });
});
