import React, { useLayoutEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { isBodyScansV1Enabled } from "@/lib/data/body-scans/bodyScansFlag";
import {
  BODY_SCAN_LIST_PAGE_MAX,
  groupBodyScansByCategory,
} from "@/lib/data/body-scans/groupBodyScansByCategory";
import { useBodyScans } from "@/lib/data/body-scans/useBodyScans";
import type { BodyScanType } from "@/lib/contracts";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { BodyScanCategoryList } from "@/lib/ui/body-scans/BodyScanCategoryList";
import { BodyScanCategoryTypeChooser } from "@/lib/ui/body-scans/BodyScanCategoryTypeChooser";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";

export default function BodyScansHubScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const enabled = isBodyScansV1Enabled();
  const scans = useBodyScans({ enabled });
  const [chooserOpen, setChooserOpen] = useState(false);

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

  const grouped = useMemo(() => {
    if (scans.status !== "ready") {
      return groupBodyScansByCategory([], { listComplete: true });
    }
    return groupBodyScansByCategory(scans.data.items, {
      listComplete: scans.data.items.length < BODY_SCAN_LIST_PAGE_MAX,
    });
  }, [scans]);

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
        ) : scans.status === "partial" ? (
          <LoadingState message="Loading scans…" />
        ) : scans.status === "error" ? (
          <ErrorState
            message={scans.error}
            requestId={scans.requestId}
            onRetry={() => scans.refetch()}
          />
        ) : (
          <BodyScanCategoryList
            groups={grouped.groups}
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
