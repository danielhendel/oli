import React from "react";
import { Text, View } from "react-native";

import { DottedRangeLegendList } from "@/components/metrics/DottedRangeLegendList";
import type { MetricExplainerScreenVm } from "@/lib/metrics/metricExplainerVm";
import { MetricRangesExplainerLayout } from "@/lib/ui/metrics/MetricRangesExplainerLayout";
import { rangeExplainerSheetStyles as sheetStyles } from "@/lib/ui/workouts/rangeExplainerSheetStyles";

export type MetricExplainerSheetBodyProps = {
  vm: MetricExplainerScreenVm;
  scrollTestID: string;
  legendTestIdPrefix: string;
};

export function MetricExplainerSheetBody({
  vm,
  scrollTestID,
  legendTestIdPrefix,
}: MetricExplainerSheetBodyProps): React.ReactElement {
  const readingA11yLabel = vm.readingLines.join(". ");
  const metricExplainerA11yLabel = [vm.metricExplainerTitle, ...vm.metricExplainerParagraphs].join(" ");
  const hasStructuredSection = vm.structuredSection != null;

  return (
    <MetricRangesExplainerLayout
      readingSlot={
        <>
          <View
            style={sheetStyles.personalCard}
            accessibilityRole="summary"
            accessibilityLabel={readingA11yLabel}
          >
            <Text style={sheetStyles.personalHeading}>Your reading</Text>
            {vm.readingLines.map((line, i) => (
              <Text key={`reading-${i}`} style={i === 0 ? sheetStyles.personalLine : sheetStyles.personalValue}>
                {line}
              </Text>
            ))}
          </View>
          {vm.baselineSlot ?? null}
        </>
      }
      metricExplainerSlot={
        hasStructuredSection ? (
          <View style={sheetStyles.structuredCardsWrap} testID={`${legendTestIdPrefix}-structured-sections`}>
            <View style={sheetStyles.personalCard} testID={`${legendTestIdPrefix}-what-this-means-card`}>
              <Text style={sheetStyles.metricExplainerTitle}>
                {vm.structuredSection?.whatThisMeansTitle ?? "What this means"}
              </Text>
              {vm.structuredSection?.whatThisMeansBody.map((line, i) => (
                <Text key={`what-${i}`} style={sheetStyles.metricExplainerParagraph}>
                  {line}
                </Text>
              ))}
            </View>

            <View style={sheetStyles.legendSection} testID={`${legendTestIdPrefix}-ranges-card`}>
              <Text style={sheetStyles.legendHeading}>{vm.structuredSection?.rangesTitle ?? vm.rangeLegendHeading}</Text>
              <DottedRangeLegendList
                rows={vm.structuredSection?.rangesRows ?? vm.rangeLegendRows}
                listTestID={`${legendTestIdPrefix}-legend`}
                rowTestID={(key) => `${legendTestIdPrefix}-legend-row-${key}`}
                dotTestID={(key) => `${legendTestIdPrefix}-legend-dot-${key}`}
              />
            </View>

            {vm.structuredSection?.howToUseBody ? (
              <View style={sheetStyles.personalCard} testID={`${legendTestIdPrefix}-how-to-use-card`}>
                <Text style={sheetStyles.metricExplainerTitle}>
                  {vm.structuredSection.howToUseTitle ?? "How to use this"}
                </Text>
                <Text style={sheetStyles.metricExplainerParagraph}>{vm.structuredSection.howToUseBody}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View accessibilityRole="text" accessibilityLabel={metricExplainerA11yLabel}>
            <Text style={sheetStyles.metricExplainerTitle}>{vm.metricExplainerTitle}</Text>
            {vm.metricExplainerParagraphs.map((paragraph, i) => (
              <Text key={`expl-${i}`} style={sheetStyles.metricExplainerParagraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        )
      }
      legendHeading={hasStructuredSection ? null : vm.rangeLegendHeading}
      legendSlot={
        hasStructuredSection ? null : (
          <DottedRangeLegendList
            rows={vm.rangeLegendRows}
            listTestID={`${legendTestIdPrefix}-legend`}
            rowTestID={(key) => `${legendTestIdPrefix}-legend-row-${key}`}
            dotTestID={(key) => `${legendTestIdPrefix}-legend-dot-${key}`}
          />
        )
      }
      sectionHeading={hasStructuredSection ? "" : vm.rangeMeaningsHeading}
      tiers={hasStructuredSection ? [] : vm.tierMeanings}
      scrollTestID={scrollTestID}
    />
  );
}
