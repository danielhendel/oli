/**
 * Sleep stage detail sheet (Deep / REM) — presentation only.
 * View model and history are owned by the card/container hook.
 *
 * Single dual-marker typical-range bar (Duration visual grammar).
 * Personal Context rail is intentionally omitted from the visible hierarchy.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { SleepStageDetailViewModel } from "@/lib/data/sleep/buildSleepStageDetailViewModel";
import { MetricDetailShell } from "@/lib/ui/common/MetricDetailShell";
import { SleepStageAdultContextBar } from "@/lib/ui/sleep/SleepStageAdultContextBar";
import {
  SleepStagePatternComparisonSkeleton,
  SleepStagePatternComparisonView,
} from "@/lib/ui/sleep/SleepStagePatternComparison";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type SleepStageDetailSheetProps = {
  visible: boolean;
  onClose: () => void;
  vm: SleepStageDetailViewModel;
  onRetryHistory?: () => void;
  testID?: string;
};

export function SleepStageDetailSheet({
  visible,
  onClose,
  vm,
  onRetryHistory,
  testID,
}: SleepStageDetailSheetProps): React.ReactElement {
  const resolvedTestID =
    testID ??
    (vm.metricId === "deep_sleep" ? "deep-sleep-detail-sheet" : "rem-sleep-detail-sheet");
  const patternTestID =
    vm.metricId === "deep_sleep" ? "deep-sleep-pattern" : "rem-sleep-pattern";
  const historyErrorTestID =
    vm.metricId === "deep_sleep"
      ? "deep-sleep-history-error"
      : "rem-sleep-history-error";
  const historyRetryTestID =
    vm.metricId === "deep_sleep"
      ? "deep-sleep-history-retry"
      : "rem-sleep-history-retry";
  const adultTestID =
    vm.metricId === "deep_sleep"
      ? "deep-sleep-adult-context"
      : "rem-sleep-adult-context";

  const referenceSlot =
    vm.adultContext != null ? (
      <SleepStageAdultContextBar
        belowLabel={vm.adultContext.belowLabel}
        typicalLabel={vm.adultContext.typicalLabel}
        aboveLabel={vm.adultContext.aboveLabel}
        belowRangeText={vm.adultContext.belowRangeText}
        typicalRangeText={vm.adultContext.typicalRangeText}
        aboveRangeText={vm.adultContext.aboveRangeText}
        zoneFractions={vm.adultContext.zoneFractions}
        currentMarkerPosition01={vm.adultContext.currentMarkerPosition01}
        ninetyDayMarkerPosition01={vm.adultContext.ninetyDayMarkerPosition01}
        accessibilitySummary={vm.adultContext.accessibilitySummary}
        testID={adultTestID}
      />
    ) : null;

  let patternSlot: React.ReactNode = null;
  if (vm.isHistoryLoading) {
    patternSlot = <SleepStagePatternComparisonSkeleton testID={patternTestID} />;
  } else if (vm.historyStatus === "error") {
    patternSlot = (
      <View style={styles.errorBlock} testID={historyErrorTestID}>
        <Text style={styles.errorText}>
          {vm.historyErrorMessage ?? "Could not load recent sleep averages."}
        </Text>
        {vm.canRetryHistory && onRetryHistory ? (
          <Pressable
            onPress={onRetryHistory}
            accessibilityRole="button"
            accessibilityLabel="Retry loading sleep averages"
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
            testID={historyRetryTestID}
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  } else if (vm.pattern != null) {
    patternSlot = (
      <SleepStagePatternComparisonView pattern={vm.pattern} testID={patternTestID} />
    );
  }

  return (
    <MetricDetailShell
      visible={visible}
      onClose={onClose}
      title={vm.title}
      heroValue={vm.currentFormatted}
      statusSentence={vm.percentOfTotalSleepSentence}
      accessibilitySummary={vm.accessibilitySummary}
      testID={resolvedTestID}
      referenceVisualization={referenceSlot}
      averages={patternSlot}
      sections={vm.explainers}
      dataAccuracyBody={vm.dataAccuracyBody}
      showDone
    />
  );
}

const styles = StyleSheet.create({
  errorBlock: {
    gap: 8,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_MUTED,
  },
  retry: {
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  retryPressed: {
    opacity: 0.8,
  },
  retryLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
});
