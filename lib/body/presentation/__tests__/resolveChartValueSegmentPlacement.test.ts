import {
  buildClassificationChartMarker,
  resolveChartValueSegmentPlacement,
} from "@/lib/body/presentation/resolveChartValueSegmentPlacement";
import type { BodyMetricClassificationChartSegment } from "@/lib/body/presentation/bodyMetricCardTypes";

const gallagherMale4059: readonly BodyMetricClassificationChartSegment[] = [
  {
    id: "lower",
    label: "Lower",
    formattedRange: "<11%",
    tone: "cool",
    lowerBound: null,
    upperBound: 11,
    lowerInclusive: false,
    upperInclusive: false,
  },
  {
    id: "mid_range",
    label: "Mid-range",
    formattedRange: "11–<22%",
    tone: "reference",
    lowerBound: 11,
    upperBound: 22,
    lowerInclusive: true,
    upperInclusive: false,
  },
  {
    id: "higher",
    label: "Higher",
    formattedRange: "≥22%",
    tone: "caution",
    lowerBound: 22,
    upperBound: null,
    lowerInclusive: true,
    upperInclusive: false,
  },
];

describe("resolveChartValueSegmentPlacement", () => {
  it("places values into Lower / Mid-range / Higher without inventing zero", () => {
    expect(resolveChartValueSegmentPlacement({ value: 10.9, segments: gallagherMale4059 })?.segmentId).toBe(
      "lower",
    );
    expect(resolveChartValueSegmentPlacement({ value: 11, segments: gallagherMale4059 })?.segmentId).toBe(
      "mid_range",
    );
    expect(resolveChartValueSegmentPlacement({ value: 18, segments: gallagherMale4059 })?.segmentId).toBe(
      "mid_range",
    );
    expect(resolveChartValueSegmentPlacement({ value: 22, segments: gallagherMale4059 })?.segmentId).toBe(
      "higher",
    );
    expect(resolveChartValueSegmentPlacement({ value: Number.NaN, segments: gallagherMale4059 })).toBeNull();
  });

  it("builds value-position markers without capsule labels", () => {
    const marker = buildClassificationChartMarker({
      kind: "value_position",
      value: 18,
      segments: gallagherMale4059,
      formattedValue: "18.0%",
      accessibleLabel: "Current displayed value indicated",
    });
    expect(marker).not.toBeNull();
    expect(marker!.kind).toBe("value_position");
    expect(marker!.showValueLabel).toBe(false);
    expect(marker!.segmentId).toBe("mid_range");
  });
});
