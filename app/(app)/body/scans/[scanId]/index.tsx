import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { isBodyScansV1Enabled } from "@/lib/data/body-scans/bodyScansFlag";
import { useBodyScanActions } from "@/lib/data/body-scans/useBodyScanActions";
import { useBodyScanDetail } from "@/lib/data/body-scans/useBodyScanDetail";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import {
  BodyScanDetailContent,
  type BodyScanDetailAction,
} from "@/lib/ui/body-scans/BodyScanDetailContent";
import { EmptyState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function BodyScanDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ scanId?: string }>();
  const scanId = typeof params.scanId === "string" ? params.scanId : "";
  const enabled = isBodyScansV1Enabled() && scanId.length > 0;
  const detail = useBodyScanDetail({ scanId, enabled });
  const actions = useBodyScanActions(scanId);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Scan",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  const scan = detail.status === "ready" ? detail.data.scan : undefined;

  const onReprocess = useCallback(async () => {
    const outcome = await actions.reprocess();
    if (outcome.ok) detail.refetch({ cacheBust: `reprocess-${Date.now()}` });
  }, [actions, detail]);

  const onDelete = useCallback(async () => {
    const outcome = await actions.remove();
    if (outcome.ok) router.replace("/(app)/body/scans");
  }, [actions, router]);

  const detailActions = useMemo<BodyScanDetailAction[]>(() => {
    if (!scan) return [];
    const list: BodyScanDetailAction[] = [];
    if (scan.canReview) {
      list.push({
        label: "Review measurements",
        onPress: () => router.push(`/(app)/body/scans/${scan.id}/review`),
        testID: "body-scan-action-review",
      });
    }
    if (scan.canViewOriginal) {
      list.push({
        label: "Open original report",
        onPress: () => router.push(`/(app)/body/scans/${scan.id}/report`),
        testID: "body-scan-action-report",
      });
    }
    if (scan.canRetry) {
      list.push({
        label: actions.pending === "reprocess" ? "Re-reading…" : "Re-read this report",
        onPress: () => void onReprocess(),
        disabled: actions.pending != null,
        testID: "body-scan-action-reprocess",
      });
    }
    if (scan.canDelete) {
      list.push({
        label: actions.pending === "delete" ? "Deleting…" : "Delete this scan",
        onPress: () => void onDelete(),
        disabled: actions.pending != null,
        testID: "body-scan-action-delete",
      });
    }
    return list;
  }, [actions.pending, onDelete, onReprocess, router, scan]);

  if (!isBodyScansV1Enabled()) {
    return (
      <View style={styles.root}>
        <ModuleScreenShell title="Scan" hideTitleChrome>
          <EmptyState
            title="Body Scans are not available yet"
            description="This section will open once scan support is released."
            testID="body-scan-detail-disabled"
          />
        </ModuleScreenShell>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Scan" hideTitleChrome>
        <BodyScanDetailContent
          status={detail.status === "idle" ? "partial" : detail.status}
          {...(detail.status === "error"
            ? { error: detail.error, requestId: detail.requestId }
            : {})}
          {...(scan ? { scan } : {})}
          actions={detailActions}
          actionErrorMessage={actions.errorMessage}
          onRetry={() => detail.refetch()}
        />
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
