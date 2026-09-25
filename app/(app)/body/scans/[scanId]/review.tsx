import React, { useCallback, useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { isBodyScansV1Enabled } from "@/lib/data/body-scans/bodyScansFlag";
import { useBodyScanActions } from "@/lib/data/body-scans/useBodyScanActions";
import { useBodyScanReview } from "@/lib/data/body-scans/useBodyScanDetail";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { BodyScanReviewContent } from "@/lib/ui/body-scans/BodyScanReviewContent";
import { EmptyState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function BodyScanReviewScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ scanId?: string }>();
  const scanId = typeof params.scanId === "string" ? params.scanId : "";
  const flagEnabled = isBodyScansV1Enabled();
  const review = useBodyScanReview({ scanId, enabled: flagEnabled && scanId.length > 0 });
  const actions = useBodyScanActions(scanId);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Review scan",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  const onConfirm = useCallback(
    async (submission: {
      corrections: { fieldId: string; value: number | null }[];
      acknowledgedFieldIds: string[];
    }) => {
      const outcome = await actions.confirm({
        corrections: submission.corrections,
        acknowledgedFieldIds: submission.acknowledgedFieldIds,
      });
      if (outcome.ok) router.replace(`/(app)/body/scans/${scanId}`);
      else review.refetch({ cacheBust: `confirm-${Date.now()}` });
    },
    [actions, review, router, scanId],
  );

  if (!flagEnabled) {
    return (
      <View style={styles.root}>
        <ModuleScreenShell title="Review scan" hideTitleChrome>
          <EmptyState
            title="Body Scans are not available yet"
            description="This section will open once scan support is released."
            testID="body-scan-review-disabled"
          />
        </ModuleScreenShell>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Review scan" hideTitleChrome>
        <BodyScanReviewContent
          status={review.status === "idle" ? "partial" : review.status}
          {...(review.status === "error"
            ? { error: review.error, requestId: review.requestId }
            : {})}
          {...(review.status === "ready" ? { review: review.data } : {})}
          submitting={actions.pending === "confirm"}
          submitErrorMessage={actions.errorMessage}
          onRetry={() => review.refetch()}
          onConfirm={(submission) => void onConfirm(submission)}
        />
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
