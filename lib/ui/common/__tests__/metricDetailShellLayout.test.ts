import { describe, expect, it } from "@jest/globals";

import {
  METRIC_DETAIL_BODY_END_SPACING,
  METRIC_DETAIL_FOOTER_MIN_HEIGHT,
  METRIC_DETAIL_TOP_BACKDROP_GAP,
  metricDetailBodyBottomInset,
  metricDetailSheetHeight,
} from "@/lib/ui/common/metricDetailShellLayout";

describe("metricDetailSheetHeight", () => {
  it("subtracts top Safe Area and backdrop gap from window height", () => {
    expect(
      metricDetailSheetHeight({
        windowHeight: 844,
        topSafeArea: 59,
        topBackdropGap: METRIC_DETAIL_TOP_BACKDROP_GAP,
      }),
    ).toBe(844 - 59 - METRIC_DETAIL_TOP_BACKDROP_GAP);
  });

  it("responds to window-height changes without fixed device heights", () => {
    const a = metricDetailSheetHeight({ windowHeight: 667, topSafeArea: 20 });
    const b = metricDetailSheetHeight({ windowHeight: 932, topSafeArea: 59 });
    expect(a).toBe(667 - 20 - METRIC_DETAIL_TOP_BACKDROP_GAP);
    expect(b).toBe(932 - 59 - METRIC_DETAIL_TOP_BACKDROP_GAP);
    expect(b).toBeGreaterThan(a);
  });

  it("clamps non-positive results", () => {
    expect(metricDetailSheetHeight({ windowHeight: 10, topSafeArea: 40 })).toBe(0);
  });
});

describe("metricDetailBodyBottomInset", () => {
  it("clears measured footer plus bottom Safe Area plus end spacing", () => {
    expect(
      metricDetailBodyBottomInset({
        footerHeight: 56,
        bottomSafeArea: 34,
        endSpacing: METRIC_DETAIL_BODY_END_SPACING,
      }),
    ).toBe(56 + 34 + METRIC_DETAIL_BODY_END_SPACING);
  });

  it("never uses a footer shorter than the minimum Done height", () => {
    expect(
      metricDetailBodyBottomInset({
        footerHeight: 20,
        bottomSafeArea: 0,
      }),
    ).toBe(METRIC_DETAIL_FOOTER_MIN_HEIGHT + METRIC_DETAIL_BODY_END_SPACING);
  });
});
