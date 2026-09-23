import {
  formatWeightTrendCurrentDate,
  formatWeightTrendObservedAxisLabels,
  formatWeightTrendObservedCoverageLabel,
} from "@/lib/body/presentation/formatWeightTrendDates";

describe("formatWeightTrendCurrentDate", () => {
  it("formats EEE, MMM d", () => {
    expect(formatWeightTrendCurrentDate("2026-09-16")).toBe("Wed, Sep 16");
    expect(formatWeightTrendCurrentDate("2026-01-05")).toBe("Mon, Jan 5");
  });
});

describe("formatWeightTrendObservedCoverageLabel", () => {
  it("includes years when the observed window crosses years", () => {
    expect(
      formatWeightTrendObservedCoverageLabel({
        firstDayKey: "2025-09-22",
        lastDayKey: "2026-09-16",
      }),
    ).toBe("Sep 22, 2025 – Sep 16, 2026");
  });

  it("omits years for same-year extents", () => {
    expect(
      formatWeightTrendObservedCoverageLabel({
        firstDayKey: "2026-06-01",
        lastDayKey: "2026-09-16",
      }),
    ).toBe("Jun 1 – Sep 16");
  });

  it("formats a single-day extent", () => {
    expect(
      formatWeightTrendObservedCoverageLabel({
        firstDayKey: "2026-09-16",
        lastDayKey: "2026-09-16",
      }),
    ).toBe("Sep 16, 2026");
  });
});

describe("formatWeightTrendObservedAxisLabels", () => {
  it("keeps split labels in sync with the centered coverage string", () => {
    expect(
      formatWeightTrendObservedAxisLabels({
        firstDayKey: "2025-09-22",
        lastDayKey: "2026-09-16",
      }),
    ).toEqual({
      kind: "range",
      startLabel: "Sep 22, 2025",
      endLabel: "Sep 16, 2026",
    });
  });
});
