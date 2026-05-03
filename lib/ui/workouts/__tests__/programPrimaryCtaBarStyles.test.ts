import { StyleSheet } from "react-native";

import {
  PRIMARY_ACTION_BAR_SHELL_HEIGHT,
  PRIMARY_TRAINING_CARD_PADDING_HORIZONTAL,
  primaryActionContainerStyle,
  programPrimaryCtaBarStyles,
} from "@/lib/ui/workouts/programPrimaryCtaBarStyles";

describe("programPrimaryCtaBarStyles", () => {
  it("exports the shared horizontal card gutter for Program + overview This Week alignment", () => {
    expect(PRIMARY_TRAINING_CARD_PADDING_HORIZONTAL).toBe(14);
  });

  it("applies the same container chrome to Create Program CTA and This Week row (single primaryActionContainer)", () => {
    const cta = StyleSheet.flatten([
      programPrimaryCtaBarStyles.primaryActionContainer,
      programPrimaryCtaBarStyles.ctaBarCenterLayout,
    ]);
    const thisWeek = StyleSheet.flatten([
      programPrimaryCtaBarStyles.primaryActionContainer,
      programPrimaryCtaBarStyles.thisWeekRowLayout,
    ]);
    expect(thisWeek.height).toBe(cta.height);
    expect(thisWeek.height).toBe(PRIMARY_ACTION_BAR_SHELL_HEIGHT);
    expect(thisWeek.paddingHorizontal).toBe(cta.paddingHorizontal);
    expect(thisWeek.paddingVertical).toBe(cta.paddingVertical);
    expect(thisWeek.borderRadius).toBe(cta.borderRadius);
    expect(thisWeek.backgroundColor).toBe(cta.backgroundColor);
    expect(thisWeek.overflow).toBe(cta.overflow);
  });

  it("keeps primaryActionContainer aligned to primaryActionContainerStyle (no duplicate literals)", () => {
    const flat = StyleSheet.flatten(programPrimaryCtaBarStyles.primaryActionContainer);
    for (const k of ["height", "borderRadius", "backgroundColor", "paddingHorizontal", "paddingVertical", "overflow"] as const) {
      expect(flat[k]).toBe(primaryActionContainerStyle[k]);
    }
  });

  it("thisWeekRowLayout is layout-only (no overrides of height, radius, or padding)", () => {
    const layout = StyleSheet.flatten(programPrimaryCtaBarStyles.thisWeekRowLayout);
    expect(layout.height).toBeUndefined();
    expect(layout.minHeight).toBeUndefined();
    expect(layout.paddingHorizontal).toBeUndefined();
    expect(layout.paddingVertical).toBeUndefined();
    expect(layout.borderRadius).toBeUndefined();
    expect(layout.backgroundColor).toBeUndefined();
  });

  it("row menu control does not set minHeight or height (hitSlop only for touch)", () => {
    const m = StyleSheet.flatten(programPrimaryCtaBarStyles.rowMenuBtn);
    expect(m.minHeight).toBeUndefined();
    expect(m.height).toBeUndefined();
  });
});
