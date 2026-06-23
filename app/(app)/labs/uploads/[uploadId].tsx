import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";

import { useLabUploadDetail } from "@/lib/data/labs/useLabUploadDetail";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { LabUploadDetailContent } from "@/lib/ui/labs/LabUploadDetailContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function LabUploadDetailScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ uploadId?: string | string[] }>();
  const raw = params.uploadId;
  const uploadId = (typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "") ?? "";

  const detail = useLabUploadDetail({ uploadId, enabled: uploadId.length > 0 });

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Lab upload",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Lab upload" hideTitleChrome>
        <LabUploadDetailContent
          status={detail.status}
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
