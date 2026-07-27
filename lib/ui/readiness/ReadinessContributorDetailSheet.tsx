/**
 * Shared readiness contributor detail sheet — presentation only.
 * View model and history are owned by the controller/hook.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ReadinessContributorDetailViewModel } from "@/lib/data/readiness/readinessContributorDetailTypes";
import { MetricDetailShell } from "@/lib/ui/common/MetricDetailShell";
import {
  ReadinessContributorPatternComparisonSkeleton,
  ReadinessContributorPatternComparisonView,
} from "@/lib/ui/readiness/ReadinessContributorPatternComparison";
import { ReadinessContributorScoreBar } from "@/lib/ui/readiness/ReadinessContributorScoreBar";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type ReadinessContributorDetailSheetProps = {
  visible: boolean;
  onClose: () => void;
  vm: ReadinessContributorDetailViewModel;
  onRetryHistory?: () => void;
  testID?: string;
};

export function ReadinessContributorDetailSheet({
  visible,
  onClose,
  vm,
  onRetryHistory,
  testID = "readiness-contributor-detail-sheet",
}: ReadinessContributorDetailSheetProps): React.ReactElement {
  const referenceSlot =
    vm.scoreBar != null ? (
      <ReadinessContributorScoreBar
        supportingLabel={vm.scoreBar.supportingLabel}
        payAttentionLabel={vm.scoreBar.payAttentionLabel}
        fairLabel={vm.scoreBar.fairLabel}
        goodLabel={vm.scoreBar.goodLabel}
        optimalLabel={vm.scoreBar.optimalLabel}
        payAttentionRangeText={vm.scoreBar.payAttentionRangeText}
        fairRangeText={vm.scoreBar.fairRangeText}
        goodRangeText={vm.scoreBar.goodRangeText}
        optimalRangeText={vm.scoreBar.optimalRangeText}
        zoneFractions={vm.scoreBar.zoneFractions}
        currentMarkerPosition01={vm.scoreBar.currentMarkerPosition01}
        accessibilitySummary={vm.scoreBar.accessibilitySummary}
        testID={`${testID}-score-bar`}
      />
    ) : null;

  let patternSlot: React.ReactNode = null;
  if (vm.currentPresence === "absent") {
    patternSlot = null;
  } else if (vm.isHistoryLoading) {
    patternSlot = (
      <ReadinessContributorPatternComparisonSkeleton testID={`${testID}-pattern`} />
    );
  } else if (vm.historyStatus === "error") {
    patternSlot = (
      <View style={styles.errorBlock} testID={`${testID}-history-error`}>
        <Text style={styles.errorText}>
          {vm.historyErrorMessage ?? "Could not load recent averages."}
        </Text>
        {vm.canRetryHistory && onRetryHistory ? (
          <Pressable
            onPress={onRetryHistory}
            accessibilityRole="button"
            accessibilityLabel="Retry loading averages"
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
            testID={`${testID}-history-retry`}
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  } else if (vm.pattern != null) {
    patternSlot = (
      <ReadinessContributorPatternComparisonView
        pattern={vm.pattern}
        testID={`${testID}-pattern`}
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
