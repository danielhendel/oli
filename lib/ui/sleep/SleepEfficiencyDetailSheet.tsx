/**
 * Sleep Efficiency detail sheet — presentation only.
 * View model and history are owned by the card/container hook.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { SleepEfficiencyDetailViewModel } from "@/lib/data/sleep/buildSleepEfficiencyDetailViewModel";
import { MetricDetailShell } from "@/lib/ui/common/MetricDetailShell";
import { SleepEfficiencyGuidelineBar } from "@/lib/ui/sleep/SleepEfficiencyGuidelineBar";
import {
  SleepEfficiencyPatternComparisonSkeleton,
  SleepEfficiencyPatternComparisonView,
} from "@/lib/ui/sleep/SleepEfficiencyPatternComparison";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type SleepEfficiencyDetailSheetProps = {
  visible: boolean;
  onClose: () => void;
  vm: SleepEfficiencyDetailViewModel;
  onRetryHistory?: () => void;
  testID?: string;
};

export function SleepEfficiencyDetailSheet({
  visible,
  onClose,
  vm,
  onRetryHistory,
  testID = "sleep-efficiency-detail-sheet",
}: SleepEfficiencyDetailSheetProps): React.ReactElement {
  const referenceSlot =
    vm.guideline != null ? (
      <SleepEfficiencyGuidelineBar
        belowLabel={vm.guideline.belowLabel}
        meetsLabel={vm.guideline.meetsLabel}
        belowRangeText={vm.guideline.belowRangeText}
        meetsRangeText={vm.guideline.meetsRangeText}
        zoneFractions={vm.guideline.zoneFractions}
        currentMarkerPosition01={vm.guideline.currentMarkerPosition01}
        accessibilitySummary={vm.guideline.accessibilitySummary}
        testID="sleep-efficiency-guideline"
      />
    ) : null;

  let patternSlot: React.ReactNode = null;
  if (vm.isHistoryLoading) {
    patternSlot = <SleepEfficiencyPatternComparisonSkeleton />;
  } else if (vm.historyStatus === "error") {
    patternSlot = (
      <View style={styles.errorBlock} testID="sleep-efficiency-history-error">
        <Text style={styles.errorText}>
          {vm.historyErrorMessage ?? "Could not load recent sleep averages."}
        </Text>
        {vm.canRetryHistory && onRetryHistory ? (
          <Pressable
            onPress={onRetryHistory}
            accessibilityRole="button"
            accessibilityLabel="Retry loading sleep averages"
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
            testID="sleep-efficiency-history-retry"
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  } else if (vm.pattern != null) {
    patternSlot = <SleepEfficiencyPatternComparisonView pattern={vm.pattern} />;
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
