import React, { useCallback, useLayoutEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";

import { isBodyScansV1Enabled } from "@/lib/data/body-scans/bodyScansFlag";
import { useBodyScanCategorySummaries } from "@/lib/data/body-scans/useBodyScanCategorySummaries";
import type { BodyScanType } from "@/lib/contracts";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { BodyScanCategorySummaryList } from "@/lib/ui/body-scans/BodyScanCategoryList";
import { BodyScanCategoryTypeChooser } from "@/lib/ui/body-scans/BodyScanCategoryTypeChooser";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";

export default function BodyScansHubScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const enabled = isBodyScansV1Enabled();
  const summaries = useBodyScanCategorySummaries({ enabled });
  const [chooserOpen, setChooserOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      summaries.refetch({ cacheBust: `hubFocus:${Date.now()}` });
    }, [enabled, summaries.refetch]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Body Scans",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      headerRight: () =>
        enabled ? (
          <Pressable
            onPress={() => setChooserOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Add a body scan"
            style={styles.headerAdd}
            testID="body-scans-hub-add"
          >
            <Text style={styles.headerAddText}>Add</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, enabled]);

  const openCategory = (scanType: BodyScanType) => {
    router.push(`/(app)/body/scans/type/${scanType}`);
  };

  const openAdd = (scanType: BodyScanType) => {
    router.push(`/(app)/body/scans/new?scanType=${scanType}`);
  };

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Body Scans" hideTitleChrome>
        {!enabled ? (
          <EmptyState
            title="Body Scans are not available yet"
            description="This section will open once scan support is released."
            testID="body-scans-disabled"
          />
        ) : summaries.status === "partial" &&
          summaries.rows.every((r) => r.rowStatus === "partial") ? (
          <LoadingState message="Loading scans…" />
        ) : summaries.status === "error" ? (
          <ErrorState
            message="Could not load scans"
            requestId={null}
            onRetry={() => summaries.refetch()}
          />
        ) : (
          <BodyScanCategorySummaryList
            rows={summaries.rows}
            onPressCategory={openCategory}
            testID="body-scans-hub-category-list"
          />
        )}
      </ModuleScreenShell>
      <BodyScanCategoryTypeChooser
        visible={chooserOpen}
        onClose={() => setChooserOpen(false)}
        onSelect={openAdd}
      />
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
