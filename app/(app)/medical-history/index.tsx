/**
 * Medical History — Document OS upload/list when flag enabled; otherwise honest placeholder.
 */
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

export default function MedicalHistoryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const documentOs = isDocumentIngestionOsV1Enabled();
  const documents = useDocuments({ domain: "medical_history", enabled: documentOs });

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: "Medical History",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  if (!documentOs) {
    return (
      <View style={styles.root}>
        <HealthRecordPlaceholderScreen
          title="Medical History"
          emptyDescription="This record system is not implemented yet. Medical history cannot be stored here until persistence ships."
          icon="clipboard-outline"
          actionLabel="Add Medical History"
          actionDisabled
          testID="medical-history-placeholder"
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Medical History" hideTitleChrome>
        <View style={styles.headerCard}>
          <Text style={styles.headerBody}>
            Store medical history documents securely. Clinical fields are not extracted or interpreted.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload medical history document"
            onPress={() => router.push("/(app)/documents/upload?domain=medical_history")}
            style={({ pressed }) => [styles.uploadBtn, pressed && styles.pressed]}
            testID="medical-history-upload"
          >
            <Text style={styles.uploadLabel}>Upload document</Text>
          </Pressable>
        </View>
        <DocumentListContent
          status={documents.status}
          {...(documents.status === "error"
            ? { error: documents.error, requestId: documents.requestId, onRetry: () => documents.refetch() }
            : {})}
          {...(documents.status === "ready" ? { items: documents.data.items } : {})}
          emptyTitle="No medical history documents yet"
          emptyDescription="Upload a medical history PDF to store it securely."
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
