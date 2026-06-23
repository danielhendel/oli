import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { useLabsSummary } from "@/lib/data/labs/useLabsSummary";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { LabsHeaderControls } from "@/lib/ui/labs/LabsHeaderControls";
import { LabsMainContent } from "@/lib/ui/labs/LabsMainContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function LabsHomeScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const summary = useLabsSummary();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: "Labs",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () => (
        <LabsHeaderControls
          onUploadPress={() => router.push("/(app)/labs/upload")}
          onListPress={() => router.push("/(app)/labs/uploads")}
        />
      ),
    });
  }, [navigation, router]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Labs" hideTitleChrome>
        <LabsMainContent
          status={summary.status}
          {...(summary.status === "error"
            ? { error: summary.error, requestId: summary.requestId, onRetry: () => summary.refetch() }
            : {})}
          {...(summary.status === "ready" ? { data: summary.data } : {})}
          onPressMetric={(metricKey) => router.push(`/(app)/labs/metric/${metricKey}`)}
        />
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
