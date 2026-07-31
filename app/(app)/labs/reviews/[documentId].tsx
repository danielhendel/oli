import React, { useCallback, useLayoutEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { useLabReviewDetail } from "@/lib/data/labs/useLabReviewDetail";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { LabReviewDetailContent } from "@/lib/ui/labs/LabReviewDetailContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function LabReviewDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ documentId?: string | string[] }>();
  const raw = params.documentId;
  const documentId = (typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "") ?? "";
  const detail = useLabReviewDetail({ documentId, enabled: documentId.length > 0 });
  const [actionBusy, setActionBusy] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Review report",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  const runAction = useCallback(async (fn: () => Promise<{ ok: boolean; error?: string; conflict?: boolean }>) => {
    setActionBusy(true);
    try {
      const result = await fn();
      if (!result.ok) {
        if (result.conflict) {
          Alert.alert("Review updated elsewhere", "Refreshing this review.", [{ text: "OK", onPress: () => detail.refetch() }]);
          return;
        }
        Alert.alert("Couldn’t save", result.error ?? "Try again in a moment.", [{ text: "OK" }]);
      }
    } finally {
      setActionBusy(false);
    }
  }, [detail]);

  const onAcceptCandidate = useCallback(
    (candidateId: string) => {
      void runAction(() => detail.patchCandidate(candidateId, { reviewStatus: "accepted" }));
    },
    [detail, runAction],
  );

  const onEditCandidate = useCallback(
    (candidateId: string) => {
      void runAction(() => detail.patchCandidate(candidateId, { reviewStatus: "corrected" }));
    },
    [detail, runAction],
  );

  const onRejectCandidate = useCallback(
    (candidateId: string) => {
      void runAction(() => detail.rejectCandidates([candidateId]));
    },
    [detail, runAction],
  );

  const onSaveProgress = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(app)/labs/reviews");
  }, [router]);

  const onFinishReview = useCallback(() => {
    if (detail.status !== "ready") return;
    const acceptedIds = [...detail.data.candidates, ...detail.data.unmatched]
      .filter((c) => c.reviewStatus === "accepted" || c.reviewStatus === "corrected")
      .map((c) => c.id);
    if (acceptedIds.length === 0) return;

    Alert.alert(
      "Finish review?",
      `This will add ${acceptedIds.length} accepted result${acceptedIds.length === 1 ? "" : "s"} to your structured lab data. Results you have not accepted will stay unresolved.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish review",
          style: "default",
          onPress: () => {
            void (async () => {
              setActionBusy(true);
              try {
                const result = await detail.finishReview(acceptedIds);
                if (!result.ok) {
                  if (result.conflict) {
                    Alert.alert("Review updated elsewhere", "Refreshing this review.", [
                      { text: "OK", onPress: () => detail.refetch() },
                    ]);
                    return;
                  }
                  Alert.alert("Couldn’t finish review", result.error ?? "Try again in a moment.", [{ text: "OK" }]);
                  return;
                }
                Alert.alert(
                  "Review complete",
                  `${result.acceptedCount ?? acceptedIds.length} result${(result.acceptedCount ?? acceptedIds.length) === 1 ? "" : "s"} added to your labs.`,
                  [{ text: "OK", onPress: () => router.replace("/(app)/labs") }],
                );
              } finally {
                setActionBusy(false);
              }
            })();
          },
        },
      ],
    );
  }, [detail, router]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Review report" hideTitleChrome>
        <LabReviewDetailContent
          status={detail.status}
          actionBusy={actionBusy}
          {...(detail.status === "error"
            ? { error: detail.error, requestId: detail.requestId, onRetry: () => detail.refetch() }
            : {})}
          {...(detail.status === "ready" ? { data: detail.data } : {})}
          onAcceptCandidate={onAcceptCandidate}
          onEditCandidate={onEditCandidate}
          onRejectCandidate={onRejectCandidate}
          onSaveProgress={onSaveProgress}
          onFinishReview={onFinishReview}
        />
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
