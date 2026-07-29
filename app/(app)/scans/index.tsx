import React, { useLayoutEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { isDocumentIngestionOsV1Enabled } from "@/lib/data/documents/documentIngestionOsFlag";
import { useDocuments } from "@/lib/data/documents/useDocuments";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { DocumentListContent } from "@/lib/ui/documents/DocumentListContent";
import { HealthRecordPlaceholderScreen } from "@/lib/ui/health/HealthRecordPlaceholderScreen";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export default function ScansScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const documentOs = isDocumentIngestionOsV1Enabled();
  const documents = useDocuments({ domain: "scans", enabled: documentOs });

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: "Scans",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  if (!documentOs) {
    return (
      <View style={styles.root}>
        <HealthRecordPlaceholderScreen
          title="Scans"
          emptyDescription="This record system is not implemented yet. Scans and imaging reports cannot be stored here until persistence ships."
          icon="scan-outline"
          actionLabel="Add Scan"
          actionDisabled
          testID="scans-placeholder"
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Scans" hideTitleChrome>
        <View style={styles.headerCard}>
          <Text style={styles.headerBody}>
            Store scan and imaging report PDFs securely. Structured DEXA metrics are not extracted yet.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload scan report"
            onPress={() => router.push("/(app)/documents/upload?domain=scans")}
            style={({ pressed }) => [styles.uploadBtn, pressed && styles.pressed]}
            testID="scans-upload"
          >
            <Text style={styles.uploadLabel}>Upload scan report</Text>
          </Pressable>
        </View>
        <DocumentListContent
          status={documents.status}
          {...(documents.status === "error"
            ? { error: documents.error, requestId: documents.requestId, onRetry: () => documents.refetch() }
            : {})}
          {...(documents.status === "ready" ? { items: documents.data.items } : {})}
          emptyTitle="No scan documents yet"
          emptyDescription="Upload a DEXA or imaging report PDF to store it securely."
          onPressDocument={(documentId) => router.push(`/(app)/documents/${documentId}`)}
        />
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerCard: { ...elevatedCardSurfaceStyle, padding: 16, gap: 12, marginBottom: 12 },
  headerBody: { color: UI_TEXT_SECONDARY, fontSize: 14, lineHeight: 20 },
  uploadBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: UI_TEXT_PRIMARY,
    alignItems: "center",
  },
  uploadLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.85 },
});
