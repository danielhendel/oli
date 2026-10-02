import React, { useEffect, useLayoutEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import type { BodyScanType } from "@/lib/contracts";
import {
  bodyScanCategoryDefinition,
  isBodyScanCategoryType,
} from "@/lib/data/body-scans/bodyScanCategoryCatalog";
import { isBodyScansV1Enabled } from "@/lib/data/body-scans/bodyScansFlag";
import {
  BODY_SCAN_LIST_PAGE_MAX,
  selectBodyScansForCategory,
} from "@/lib/data/body-scans/groupBodyScansByCategory";
import { useBodyScans } from "@/lib/data/body-scans/useBodyScans";
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
  const scans = useBodyScans({ enabled: enabled && scanType != null });

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

  const items = useMemo(() => {
    if (!scanType || scans.status !== "ready") return [];
    return selectBodyScansForCategory(scans.data.items, scanType);
  }, [scanType, scans]);

  // Surface silent truncation risk when the untyped list page is full.
  const listMayBeTruncated =
    scans.status === "ready" && scans.data.items.length >= BODY_SCAN_LIST_PAGE_MAX;

  if (scanType == null || category == null) {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <ModuleScreenShell title={category.historyTitle} hideTitleChrome>
        {!enabled ? (
          <EmptyState
            title="Body Scans are not available yet"
            description="This section will open once scan support is released."
            testID="body-scan-category-disabled"
          />
        ) : (
          <View style={styles.body}>
            {listMayBeTruncated ? (
              <Text style={styles.truncationNote} testID="body-scan-category-truncation-note">
                Showing recent scans. Older scans may not appear yet.
              </Text>
            ) : null}
            <BodyScanCategoryHistoryContent
              status={scans.status}
              {...(scans.status === "error"
                ? {
                    error: scans.error,
                    requestId: scans.requestId,
                    onRetry: () => scans.refetch(),
                  }
                : {})}
              category={category}
              items={items}
              onPressScan={(id) => router.push(`/(app)/body/scans/${id}`)}
              onPressAdd={() =>
                router.push(`/(app)/body/scans/new?scanType=${category.type}`)
              }
            />
          </View>
        )}
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, gap: 10 },
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
  truncationNote: {
    color: "rgba(235,235,245,0.55)",
    fontSize: 12,
    paddingHorizontal: 2,
  },
});
