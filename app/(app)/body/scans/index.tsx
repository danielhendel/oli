import React, { useLayoutEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { isBodyScansV1Enabled } from "@/lib/data/body-scans/bodyScansFlag";
import { useBodyScans } from "@/lib/data/body-scans/useBodyScans";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { BodyScanListContent } from "@/lib/ui/body-scans/BodyScanListContent";
import { EmptyState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export default function BodyScansListScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const enabled = isBodyScansV1Enabled();
  const scans = useBodyScans({ enabled });

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Body Scans",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Body Scans" hideTitleChrome>
        {!enabled ? (
          <EmptyState
            title="Body Scans are not available yet"
            description="This section will open once scan support is released."
            testID="body-scans-disabled"
          />
        ) : (
          <View style={styles.body}>
            <BodyScanListContent
              status={scans.status}
              {...(scans.status === "error"
                ? {
                    error: scans.error,
                    requestId: scans.requestId,
                    onRetry: () => scans.refetch(),
                  }
                : {})}
              {...(scans.status === "ready" ? { items: scans.data.items } : {})}
              onPressScan={(scanId) => router.push(`/(app)/body/scans/${scanId}`)}
            />
            <Pressable
              onPress={() => router.push("/(app)/body/scans/new")}
              accessibilityRole="button"
              accessibilityLabel="Upload a scan report"
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              testID="body-scans-upload"
            >
              <Text style={styles.actionLabel}>Upload a scan</Text>
            </Pressable>
          </View>
        )}
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { gap: 12 },
  action: {
    ...elevatedCardSurfaceStyle,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionPressed: { opacity: 0.85 },
  actionLabel: { color: UI_TEXT_PRIMARY, fontSize: 15, fontWeight: "600" },
});
