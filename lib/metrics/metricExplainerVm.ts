import type React from "react";
import type { MetricRangesExplainerTierBlock } from "@/lib/ui/metrics/MetricRangesExplainerLayout";

/** Dot-row VM shared by Body Composition legends and energy explainers. */
export type MetricLegendRowVm = {
  key: string;
  label: string;
  rangeLine: string;
  dotColor: string;
};

export type MetricExplainerStructuredSectionVm = {
  whatThisMeansTitle: string;
  whatThisMeansBody: readonly string[];
  rangesTitle: string;
  rangesRows: readonly MetricLegendRowVm[];
  howToUseTitle?: string;
  howToUseBody?: string;
};

export type MetricExplainerScreenVm = {
  navigationTitle: string;
  readingLines: readonly string[];
  baselineSlot?: React.ReactNode;
  structuredSection?: MetricExplainerStructuredSectionVm;
  metricExplainerTitle: string;
  metricExplainerParagraphs: readonly string[];
  rangeLegendHeading: string;
  rangeLegendRows: readonly MetricLegendRowVm[];
  rangeMeaningsHeading: string;
  tierMeanings: readonly MetricRangesExplainerTierBlock[];
};
