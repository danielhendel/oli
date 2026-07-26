/**
 * Resting Heart Rate detail sheet — presentation only.
 * View model and history are owned by the card/container hook.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RestingHeartRateDetailViewModel } from "@/lib/data/readiness/buildRestingHeartRateDetailViewModel";
import { MetricDetailShell } from "@/lib/ui/common/MetricDetailShell";
import { RestingHeartRatePersonalRangeBar } from "@/lib/ui/readiness/RestingHeartRatePersonalRangeBar";
import {
  RestingHeartRatePatternComparisonSkeleton,
  RestingHeartRatePatternComparisonView,
} from "@/lib/ui/readiness/RestingHeartRatePatternComparison";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type RestingHeartRateDetailSheetProps = {
  visible: boolean;
  onClose: () => void;
  vm: RestingHeartRateDetailViewModel;
  onRetryHistory?: () => void;
  testID?: string;
};

export function RestingHeartRateDetailSheet({
  visible,
  onClose,
  vm,
  onRetryHistory,
  testID = "resting-heart-rate-detail-sheet",
}: RestingHeartRateDetailSheetProps): React.ReactElement {
  const referenceSlot =
    vm.personalRange != null ? (
      <RestingHeartRatePersonalRangeBar
        belowLabel={vm.personalRange.belowLabel}
        usualLabel={vm.personalRange.usualLabel}
        aboveLabel={vm.personalRange.aboveLabel}
        belowRangeText={vm.personalRange.belowRangeText}
        usualRangeText={vm.personalRange.usualRangeText}
        aboveRangeText={vm.personalRange.aboveRangeText}
        zoneFractions={vm.personalRange.zoneFractions}
        currentMarkerPosition01={vm.personalRange.currentMarkerPosition01}
        accessibilitySummary={vm.personalRange.accessibilitySummary}
        testID="resting-heart-rate-personal-range"
      />
    ) : null;

  let patternSlot: React.ReactNode = null;
  if (vm.isHistoryLoading) {
    patternSlot = <RestingHeartRatePatternComparisonSkeleton />;
  } else if (vm.historyStatus === "error") {
    patternSlot = (
      <View style={styles.errorBlock} testID="resting-heart-rate-history-error">
        <Text style={styles.errorText}>
          {vm.historyErrorMessage ?? "Could not load recent heart-rate averages."}
        </Text>
        {vm.canRetryHistory && onRetryHistory ? (
          <Pressable
            onPress={onRetryHistory}
            accessibilityRole="button"
            accessibilityLabel="Retry loading heart-rate averages"
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
            testID="resting-heart-rate-history-retry"
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  } else if (vm.pattern != null) {
    patternSlot = <RestingHeartRatePatternComparisonView pattern={vm.pattern} />;
  }

  return (
    <MetricDetailShell
      visible={visible}
      onClose={onClose}
      title={vm.title}
      heroValue={vm.currentFormatted}
      statusSentence={vm.statusSentence}
      accessibilitySummary={vm.accessibilitySummary}
      testID={testID}
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
