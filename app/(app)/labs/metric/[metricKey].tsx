import React, { useLayoutEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";

import { useLabMetricDetail } from "@/lib/data/labs/useLabMetricDetail";
import { getLabMetricByKey } from "@/lib/labs/labMetricCatalog";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { LabMetricDetailContent } from "@/lib/ui/labs/LabMetricDetailContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function LabMetricDetailScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ metricKey?: string | string[] }>();
  const raw = params.metricKey;
  const metricKey = (typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "") ?? "";

  const catalog = useMemo(() => (metricKey ? getLabMetricByKey(metricKey) : undefined), [metricKey]);
  const detail = useLabMetricDetail({ metricKey, enabled: metricKey.length > 0 });

  useLayoutEffect(() => {
    const title = catalog?.displayName ?? (detail.status === "ready" ? detail.data.displayName : "Lab metric");
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title,
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation, catalog?.displayName, detail]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title={catalog?.displayName ?? "Lab metric"} hideTitleChrome>
        <LabMetricDetailContent
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
