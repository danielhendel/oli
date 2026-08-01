import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { countReviewActionStatuses } from "@/lib/data/labs/applyLabReviewCandidateStatus";
import { useLabReviewDetail } from "@/lib/data/labs/useLabReviewDetail";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import {
  LabReviewActionsFooter,
  LabReviewDetailContent,
} from "@/lib/ui/labs/LabReviewDetailContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { UI_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

function parseNumericCorrection(raw: string): { kind: "numeric"; value: number; comparator: "eq" } | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return { kind: "numeric", value, comparator: "eq" };
}

export default function LabReviewDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ documentId?: string | string[] }>();
  const raw = params.documentId;
  const documentId = (typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "") ?? "";
  const detail = useLabReviewDetail({ documentId, enabled: documentId.length > 0 });
  const [actionBusy, setActionBusy] = useState(false);
  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Review report",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  const actionCounts = useMemo(() => {
    if (detail.status !== "ready") return { accepted: 0, rejected: 0, corrected: 0, unresolved: 0 };
    return countReviewActionStatuses(detail.data);
  }, [detail]);

  const runAction = useCallback(
    async (
      candidateId: string | null,
      fn: () => Promise<{ ok: boolean; error?: string; conflict?: boolean }>,
    ) => {
      setActionBusy(true);
      if (candidateId) setSavingCandidateId(candidateId);
      try {
        const result = await fn();
        if (!result.ok) {
          if (result.conflict) {
            Alert.alert("Review updated elsewhere", "Refreshing this review.", [
              { text: "OK", onPress: () => detail.refetch({ cacheBust: String(Date.now()), noStore: true }) },
            ]);
            return;
          }
          Alert.alert("Couldn’t save", result.error ?? "Try again in a moment.", [
            { text: "Retry", onPress: () => void runAction(candidateId, fn) },
            { text: "OK", style: "cancel" },
          ]);
        }
      } finally {
        setSavingCandidateId(null);
        setActionBusy(false);
      }
    },
    [detail],
  );

  const onAcceptCandidate = useCallback(
    (candidateId: string) => {
      void runAction(candidateId, () => detail.patchCandidate(candidateId, { reviewStatus: "accepted" }));
    },
    [detail, runAction],
  );

  const onEditCandidate = useCallback(
    (candidateId: string, correction: { rawFlag?: string | null; resultValueText?: string }) => {
      const numeric = correction.resultValueText ? parseNumericCorrection(correction.resultValueText) : null;
      void runAction(candidateId, () =>
        detail.patchCandidate(candidateId, {
          correction: {
            ...(numeric ? { result: numeric } : {}),
            ...(correction.rawFlag !== undefined ? { rawFlag: correction.rawFlag } : {}),
          },
        }),
      );
    },
    [detail, runAction],
  );

  const onRejectCandidate = useCallback(
    (candidateId: string) => {
      void runAction(candidateId, () => detail.rejectCandidates([candidateId]));
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
    const unresolved = actionCounts.unresolved;

    Alert.alert(
      "Finish review?",
      `This will add ${acceptedIds.length} accepted result${acceptedIds.length === 1 ? "" : "s"} to your Labs history.` +
        (unresolved > 0
          ? ` ${unresolved} unresolved result${unresolved === 1 ? "" : "s"} will not be included.`
          : "") +
        " Accepting a result only marks it for inclusion — Finish review writes structured Labs data.",
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
                      {
                        text: "OK",
                        onPress: () => detail.refetch({ cacheBust: String(Date.now()), noStore: true }),
                      },
                    ]);
                    return;
                  }
                  Alert.alert("Couldn’t finish review", result.error ?? "Try again in a moment.", [
                    { text: "Retry" },
                    { text: "OK", style: "cancel" },
                  ]);
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
  }, [actionCounts.unresolved, detail, router]);

  const includedAccepted = actionCounts.accepted + actionCounts.corrected;

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Review report" hideTitleChrome>
        <LabReviewDetailContent
          status={detail.status}
          actionBusy={actionBusy}
          savingCandidateId={savingCandidateId}
          hideFooter
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
      {detail.status === "ready" ? (
        <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <LabReviewActionsFooter
            actionBusy={actionBusy}
            acceptedCount={includedAccepted}
            rejectedCount={actionCounts.rejected}
            unresolvedCount={actionCounts.unresolved}
            onSaveProgress={onSaveProgress}
            onFinishReview={onFinishReview}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI_SCREEN_BG },
  stickyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: UI_SCREEN_BG,
  },
});
