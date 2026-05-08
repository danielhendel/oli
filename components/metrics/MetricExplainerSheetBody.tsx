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

  return (
    <MetricRangesExplainerLayout
      readingSlot={
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
      }
      metricExplainerSlot={
        <View accessibilityRole="text" accessibilityLabel={metricExplainerA11yLabel}>
          <Text style={sheetStyles.metricExplainerTitle}>{vm.metricExplainerTitle}</Text>
          {vm.metricExplainerParagraphs.map((paragraph, i) => (
            <Text key={`expl-${i}`} style={sheetStyles.metricExplainerParagraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      }
      legendHeading={vm.rangeLegendHeading}
      legendSlot={
        <DottedRangeLegendList
          rows={vm.rangeLegendRows}
          listTestID={`${legendTestIdPrefix}-legend`}
          rowTestID={(key) => `${legendTestIdPrefix}-legend-row-${key}`}
          dotTestID={(key) => `${legendTestIdPrefix}-legend-dot-${key}`}
        />
      }
      sectionHeading={vm.rangeMeaningsHeading}
      tiers={vm.tierMeanings}
      scrollTestID={scrollTestID}
    />
  );
}
