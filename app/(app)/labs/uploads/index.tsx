import React, { useCallback, useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";

import { isDocumentIngestionOsV1Enabled } from "@/lib/data/documents/documentIngestionOsFlag";
import { useDocuments } from "@/lib/data/documents/useDocuments";
import { useLabUploads } from "@/lib/data/labs/useLabUploads";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { DocumentListContent } from "@/lib/ui/documents/DocumentListContent";
import { LabUploadsListContent } from "@/lib/ui/labs/LabUploadsListContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function LabsUploadsListScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const documentOs = isDocumentIngestionOsV1Enabled();
  const uploads = useLabUploads({ enabled: !documentOs });
  const documents = useDocuments({ domain: "labs", enabled: documentOs });
  const refetchDocuments = documents.refetch;

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Lab uploads",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!documentOs) return;
      refetchDocuments({ cacheBust: `focus-${Date.now()}` });
    }, [documentOs, refetchDocuments]),
  );

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Lab uploads" hideTitleChrome>
        {documentOs ? (
          <DocumentListContent
            status={documents.status}
            {...(documents.status === "error"
              ? { error: documents.error, requestId: documents.requestId, onRetry: () => refetchDocuments() }
              : {})}
            {...(documents.status === "ready" ? { items: documents.data.items } : {})}
            emptyTitle="No lab uploads yet"
            emptyDescription="Upload a lab PDF from the Labs page to see reports here."
            onPressDocument={(documentId) => router.push(`/(app)/documents/${documentId}`)}
          />
        ) : (
          <LabUploadsListContent
            status={uploads.status}
            {...(uploads.status === "error"
              ? { error: uploads.error, requestId: uploads.requestId, onRetry: () => uploads.refetch() }
              : {})}
            {...(uploads.status === "ready" ? { items: uploads.data.items } : {})}
            onPressUpload={(uploadId) => router.push(`/(app)/labs/uploads/${uploadId}`)}
          />
        )}
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
