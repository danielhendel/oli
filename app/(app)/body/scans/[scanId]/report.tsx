import React, { useLayoutEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";

import { isBodyScansV1Enabled } from "@/lib/data/body-scans/bodyScansFlag";
import { useDocumentOriginalPreview } from "@/lib/data/documents/useDocumentOriginalPreview";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { EmptyState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

/**
 * Original scan report. The file is fetched with a short-lived, owner-only link and handed
 * to the system preview — the link is never shown, shared, or stored.
 */
export default function BodyScanReportScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ scanId?: string }>();
  const scanId = typeof params.scanId === "string" ? params.scanId : "";
  const enabled = isBodyScansV1Enabled();
  // A scan and its source document share one id.
  const preview = useDocumentOriginalPreview(scanId.length > 0 ? scanId : null);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Original report",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Original report" hideTitleChrome>
        {!enabled ? (
          <EmptyState
            title="Body Scans are not available yet"
            description="This section will open once scan support is released."
            testID="body-scan-report-disabled"
          />
        ) : (
          <View style={styles.body} testID="body-scan-report">
            <Text style={styles.description}>
              Your report opens in your device’s file viewer. It stays private to your account.
            </Text>
            <Pressable
              onPress={() => void preview.open()}
              disabled={preview.busy}
              accessibilityRole="button"
              accessibilityLabel="Open the original report"
              accessibilityState={{ disabled: preview.busy }}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.actionPressed,
                preview.busy && styles.actionDisabled,
              ]}
              testID="body-scan-report-open"
            >
              <Text style={styles.actionLabel}>
                {preview.busy ? "Preparing…" : "Open original report"}
              </Text>
            </Pressable>
            {preview.message ? (
              <Text style={styles.message} testID="body-scan-report-message">
                {preview.message}
              </Text>
            ) : null}
          </View>
        )}
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { gap: 14 },
  description: { color: UI_TEXT_SECONDARY, fontSize: 14 },
  action: { ...elevatedCardSurfaceStyle, paddingVertical: 14, alignItems: "center" },
  actionPressed: { opacity: 0.85 },
  actionDisabled: { opacity: 0.5 },
  actionLabel: { color: UI_TEXT_PRIMARY, fontSize: 15, fontWeight: "600" },
  message: { color: UI_TEXT_PRIMARY, fontSize: 14 },
});
