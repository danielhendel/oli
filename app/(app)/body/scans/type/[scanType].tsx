import React, { useCallback, useEffect, useLayoutEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import type { BodyScanType } from "@/lib/contracts";
import {
  bodyScanCategoryDefinition,
  isBodyScanCategoryType,
} from "@/lib/data/body-scans/bodyScanCategoryCatalog";
import { isBodyScansV1Enabled } from "@/lib/data/body-scans/bodyScansFlag";
import { useBodyScanCategoryHistory } from "@/lib/data/body-scans/useBodyScanCategoryHistory";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { BodyScanCategoryHistoryContent } from "@/lib/ui/body-scans/BodyScanCategoryHistoryContent";
import { EmptyState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";

function resolveScanTypeParam(raw: string | string[] | undefined): BodyScanType | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || !value) return null;
  if (!isBodyScanCategoryType(value)) return null;
  return value;
}

export default function BodyScanCategoryHistoryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ scanType?: string | string[] }>();
  const enabled = isBodyScansV1Enabled();
  const scanType = resolveScanTypeParam(params.scanType);

  useEffect(() => {
    if (scanType == null) {
      router.replace("/(app)/body/scans");
    }
  }, [scanType, router]);

  const category = scanType ? bodyScanCategoryDefinition(scanType) : null;
  const history = useBodyScanCategoryHistory({
    scanType: scanType ?? "other",
    enabled: enabled && scanType != null,
  });

  useFocusEffect(
    useCallback(() => {
      if (!enabled || scanType == null) return;
      history.refetch({
        resetPages: true,
        cacheBust: `historyFocus:${Date.now()}`,
      });
    }, [enabled, history.refetch, scanType]),
  );

  useLayoutEffect(() => {
    if (!category) return;
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: category.historyTitle,
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () =>
        enabled ? (
          <Pressable
            onPress={() =>
              router.push(`/(app)/body/scans/new?scanType=${category.type}`)
            }
            accessibilityRole="button"
            accessibilityLabel={category.addLabel}
            style={styles.headerAdd}
            testID="body-scan-category-header-add"
          >
            <Text style={styles.headerAddText}>Add</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, category, enabled, router]);

  if (scanType == null || category == null) {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <ModuleScreenShell
        title={category.historyTitle}
        hideTitleChrome
        // Category history owns vertical scrolling via FlatList — never nest in ScrollView.
        bodyScrollEnabled={false}
      >
        {!enabled ? (
          <EmptyState
            title="Body Scans are not available yet"
            description="This section will open once scan support is released."
            testID="body-scan-category-disabled"
          />
        ) : (
          <BodyScanCategoryHistoryContent
            status={history.status}
            {...(history.status === "error"
              ? {
                  error: history.error,
                  requestId: history.requestId,
                  onRetry: () => history.refetch(),
                }
              : {})}
            category={category}
            items={history.status === "ready" ? history.items : []}
            isProvenEmpty={history.isProvenEmpty}
            hasMore={history.status === "ready" ? history.hasMore : false}
            loadingMore={history.loadingMore}
            loadMoreError={history.loadMoreError}
            onLoadMore={history.loadMore}
            onRetryLoadMore={history.loadMore}
            onPressScan={(id) => router.push(`/(app)/body/scans/${id}`)}
            onPressAdd={() =>
              router.push(`/(app)/body/scans/new?scanType=${category.type}`)
            }
          />
        )}
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerAdd: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  headerAddText: {
    color: BODY_INDIGO,
    fontSize: 15,
    fontWeight: "700",
  },
});
