import React from "react";
import { ScrollView, Text, View } from "react-native";

import { rangeExplainerSheetStyles as styles } from "@/lib/ui/workouts/rangeExplainerSheetStyles";

export type MetricRangesExplainerTierBlock = {
  title: string;
  rangeLine: string;
  body: string;
};

export type MetricRangesExplainerLayoutProps = {
  /** Optional hero card (Body “Your reading”) — rendered first when provided. */
  readingSlot?: React.ReactNode;
  /** Plain-language “what this metric means” block — rendered after reading. */
  metricExplainerSlot?: React.ReactNode;
  /** Short intro (Activity keeps this above the chart). Omitted when empty. */
  lead?: string | null;
  /** Heading inside the elevated legend card, above {@link legendSlot}. */
  legendHeading?: string | null;
  legendSlot?: React.ReactNode;
  sectionHeading: string;
  tiers: readonly MetricRangesExplainerTierBlock[];
  /** Optional footer (e.g. Activity “Your context” with nested emphasis). */
  footerSlot?: React.ReactNode;
  /** Simple footer copy when `footerSlot` is omitted (legacy Body path). */
  personalHeading?: string;
  personalLines?: string[];
  scrollTestID?: string;
};

/**
 * Shared modal body for metric range explainers (Activity steps, Body Composition, etc.).
 * Visual chrome matches Strength/Cardio range explainers via {@link rangeExplainerSheetStyles}.
 */
export function MetricRangesExplainerLayout({
  readingSlot,
  metricExplainerSlot,
  lead,
  legendHeading,
  legendSlot,
  sectionHeading,
  tiers,
  footerSlot,
  personalHeading,
  personalLines,
  scrollTestID,
}: MetricRangesExplainerLayoutProps): React.ReactElement {
  const showSimplePersonal =
    footerSlot == null &&
    personalHeading != null &&
    personalHeading.length > 0 &&
    personalLines != null &&
    personalLines.length > 0;

  const leadTrimmed = lead?.trim() ?? "";
  const legendHeadingTrimmed = legendHeading?.trim() ?? "";
  const sectionHeadingTrimmed = sectionHeading?.trim() ?? "";

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      testID={scrollTestID ?? "metric-ranges-explainer-scroll"}
    >
      {readingSlot}

      {metricExplainerSlot ? (
        <View style={styles.metricExplainerBlock}>{metricExplainerSlot}</View>
      ) : null}

      {leadTrimmed.length > 0 ? <Text style={styles.lead}>{leadTrimmed}</Text> : null}

      {legendSlot ? (
        <View style={styles.legendSection}>
          {legendHeadingTrimmed.length > 0 ? (
            <Text style={styles.legendHeading}>{legendHeadingTrimmed}</Text>
          ) : null}
          {legendSlot}
        </View>
      ) : null}

      {sectionHeadingTrimmed.length > 0 ? <Text style={styles.sectionHeading}>{sectionHeadingTrimmed}</Text> : null}
      {tiers.map((tier) => (
        <View
          key={tier.title}
          style={styles.tierBlock}
          accessibilityLabel={`${tier.title}. ${tier.rangeLine}.`}
        >
          <Text style={styles.tierTitle}>{tier.title}</Text>
          <Text style={styles.tierRange}>{tier.rangeLine}</Text>
          <Text style={styles.tierBody}>{tier.body}</Text>
        </View>
      ))}

      {footerSlot}

      {showSimplePersonal ? (
        <View style={styles.personalCard} accessibilityRole="summary">
          <Text style={styles.personalHeading}>{personalHeading}</Text>
          {personalLines!.map((line, i) => (
            <Text key={`pl-${i}`} style={i === 0 ? styles.personalLine : styles.personalValue}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
