import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { useLabUploadDetail } from "@/lib/data/labs/useLabUploadDetail";
import { isLabsOsV1Enabled } from "@/lib/data/labs/labsOsFlag";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { LabUploadDetailContent } from "@/lib/ui/labs/LabUploadDetailContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function LabUploadDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ uploadId?: string | string[] }>();
  const raw = params.uploadId;
  const uploadId = (typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "") ?? "";
  const labsOs = isLabsOsV1Enabled();

  const detail = useLabUploadDetail({ uploadId, enabled: uploadId.length > 0 });
  const needsReview =
    labsOs && detail.status === "ready" && detail.data.upload.status === "needs_review";

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Lab report",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Lab report" hideTitleChrome>
        <LabUploadDetailContent
          status={detail.status}
          showReviewLink={needsReview}
          onPressReview={() => router.push(`/(app)/labs/reviews/${uploadId}`)}
          {...(detail.status === "error"
            ? { error: detail.error, requestId: detail.requestId, onRetry: () => detail.refetch() }
            : {})}
          {...(detail.status === "ready" ? { data: detail.data } : {})}
        />
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
