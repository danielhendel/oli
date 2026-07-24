/**
 * Sleep Duration detail sheet — presentation only.
 * View model and history are owned by the card/container hook.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { SleepDurationDetailViewModel } from "@/lib/data/sleep/buildSleepDurationDetailViewModel";
import {
  SLEEP_DURATION_AVERAGE_30D_EXPECTED,
  SLEEP_DURATION_AVERAGE_7D_EXPECTED,
  type SleepDurationAverageSummary,
} from "@/lib/data/sleep/sleepDurationAverages";
import { sleepDurationReferenceAccessibilitySummary } from "@/lib/data/sleep/sleepDurationReference";
import { MetricDetailShell } from "@/lib/ui/common/MetricDetailShell";
import {
  SleepDurationAverageTiles,
  SleepDurationAverageTilesSkeleton,
} from "@/lib/ui/sleep/SleepDurationAverageTiles";
import { SleepDurationReferenceRangeBar } from "@/lib/ui/sleep/SleepDurationReferenceRangeBar";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type SleepDurationDetailSheetProps = {
  visible: boolean;
  onClose: () => void;
  vm: SleepDurationDetailViewModel;
  onRetryHistory?: () => void;
};

function emptyAverage(window: "7d" | "30d"): SleepDurationAverageSummary {
  const expectedNightCount =
    window === "7d" ? SLEEP_DURATION_AVERAGE_7D_EXPECTED : SLEEP_DURATION_AVERAGE_30D_EXPECTED;
  return {
    window,
    averageMinutes: null,
    formattedAverage: null,
    validNightCount: 0,
    expectedNightCount,
    hasEnoughData: false,
    coverageLabel: `0 of ${expectedNightCount} nights`,
    displayValue: "Not enough data",
    accessibilitySummary: `${window === "7d" ? "7 days" : "30 days"} average not enough data.`,
  };
}

export function SleepDurationDetailSheet({
  visible,
  onClose,
  vm,
  onRetryHistory,
}: SleepDurationDetailSheetProps): React.ReactElement {
  const showRange =
    vm.rangeResult != null &&
    vm.currentPresence === "present" &&
    vm.currentValueMinutes != null;

  const rangeA11y =
    showRange && vm.rangeResult != null
      ? sleepDurationReferenceAccessibilitySummary({
          formattedDuration: vm.currentFormatted,
          result: vm.rangeResult,
        })
      : "";

  let averagesSlot: React.ReactNode = null;
  if (vm.isHistoryLoading) {
    averagesSlot = <SleepDurationAverageTilesSkeleton />;
  } else if (vm.historyStatus === "error") {
    averagesSlot = (
      <View style={styles.errorBlock} testID="sleep-duration-history-error">
        <Text style={styles.errorText}>
          {vm.historyErrorMessage ?? "Could not load recent sleep averages."}
        </Text>
        {vm.canRetryHistory && onRetryHistory ? (
          <Pressable
            onPress={onRetryHistory}
            accessibilityRole="button"
            accessibilityLabel="Retry loading sleep averages"
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
            testID="sleep-duration-history-retry"
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  } else if (vm.sevenDay != null && vm.thirtyDay != null) {
    averagesSlot = (
      <SleepDurationAverageTiles sevenDay={vm.sevenDay} thirtyDay={vm.thirtyDay} />
    );
  } else if (vm.historyStatus === "ready") {
    averagesSlot = (
      <SleepDurationAverageTiles
        sevenDay={emptyAverage("7d")}
        thirtyDay={emptyAverage("30d")}
      />
    );
  }

  return (
    <MetricDetailShell
      visible={visible}
      onClose={onClose}
      title={vm.title}
      heroValue={vm.currentFormatted}
      statusSentence={vm.statusSentence}
      accessibilitySummary={vm.accessibilitySummary}
      testID="sleep-duration-detail-sheet"
      referenceVisualization={
        showRange && vm.rangeResult != null && vm.currentValueMinutes != null ? (
          <SleepDurationReferenceRangeBar
            result={vm.rangeResult}
            durationMinutes={vm.currentValueMinutes}
            accessibilitySummary={rangeA11y}
          />
        ) : null
      }
      averages={averagesSlot}
      sections={vm.explainers}
      dataAccuracyBody={vm.dataAccuracyBody}
      dataAccuracyMeta={vm.dataAccuracyContextLine}
      sourceLine={vm.sourceLine}
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
