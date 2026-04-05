// lib/ui/body/InterpretationQualityBar.tsx
// Body Composition overview track: shared 5-segment palette + display-mapped marker (see bodyOverviewBarDisplay).
import React from "react";

import type { InterpretationBarModel } from "@/lib/body/bodyOverviewInterpretationBar";
import { getBodyOverviewBarDisplay } from "@/lib/body/bodyOverviewBarDisplay";
import { MODULE_OVERVIEW_SEGMENT_ZONE_FILLS } from "@/lib/ui/overview/moduleOverviewSegmentZoneFills";
import { MODULE_OVERVIEW_SEGMENTED_TRACK } from "@/lib/ui/overview/moduleOverviewSegmentedTrackMetrics";
import { SegmentedZoneTrack } from "@/lib/ui/primitives/SegmentedZoneTrack";

export function interpretationBarAccessibilityLabel(bar: InterpretationBarModel, metricLabel: string): string {
  if (bar.hasValue) {
    const d = getBodyOverviewBarDisplay(bar);
    const pct = Math.round(d.displayMarker01 * 100);
    return `${metricLabel} interpretation: ${bar.displayLabel}. Marker at ${pct} percent along the quality scale.`;
  }
  return `${metricLabel}: no measurement; interpretation not available.`;
}

export type InterpretationQualityBarProps = {
  bar: InterpretationBarModel;
};

export function InterpretationQualityBar({ bar }: InterpretationQualityBarProps) {
  const d = getBodyOverviewBarDisplay(bar);
  return (
    <SegmentedZoneTrack
      zoneColors={MODULE_OVERVIEW_SEGMENT_ZONE_FILLS}
      markerPosition01={d.displayMarker01}
      showMarker={bar.hasValue}
      markerBackgroundColor={d.markerDotColor}
      dotSize={MODULE_OVERVIEW_SEGMENTED_TRACK.dotSize}
      barHeight={MODULE_OVERVIEW_SEGMENTED_TRACK.barHeight}
      trackRadius={MODULE_OVERVIEW_SEGMENTED_TRACK.trackRadius}
      wrapperProps={{
        accessibilityRole: "none",
        accessible: false,
        importantForAccessibility: "no",
      }}
    />
  );
}
