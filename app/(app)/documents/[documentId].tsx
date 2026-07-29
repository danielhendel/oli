import React, { useCallback, useLayoutEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { deleteDocument, reprocessDocument } from "@/lib/api/documents";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useDocumentDetail } from "@/lib/data/documents/useDocumentDetail";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { DocumentDetailContent } from "@/lib/ui/documents/DocumentDetailContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function DocumentDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { getIdToken } = useAuth();
  const params = useLocalSearchParams<{ documentId?: string }>();
  const documentId = typeof params.documentId === "string" ? params.documentId : "";
  const detail = useDocumentDetail({ documentId, enabled: documentId.length > 0 });
  const [reprocessBusy, setReprocessBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Document",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  const onReprocess = useCallback(async () => {
    setReprocessBusy(true);
    try {
      const token = await getIdToken(false);
      if (!token) return;
      await reprocessDocument(token, documentId, {}, { idempotencyKey: `reprocess-${documentId}-${Date.now()}` });
      detail.refetch({ cacheBust: String(Date.now()) });
    } finally {
      setReprocessBusy(false);
    }
  }, [detail, documentId, getIdToken]);

  const onDelete = useCallback(() => {
    Alert.alert("Delete document?", "This removes the original file and related processing records.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setDeleteBusy(true);
            try {
              const token = await getIdToken(false);
              if (!token) return;
              const res = await deleteDocument(token, documentId);
              if (res.ok) {
                router.back();
              }
            } finally {
              setDeleteBusy(false);
            }
          })();
        },
      },
    ]);
  }, [documentId, getIdToken, router]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Document" hideTitleChrome>
        <DocumentDetailContent
          status={detail.status}
          {...(detail.status === "error"
            ? { error: detail.error, requestId: detail.requestId, onRetryLoad: () => detail.refetch() }
            : {})}
          {...(detail.status === "ready" ? { document: detail.data.document } : {})}
          onReprocess={() => void onReprocess()}
          onDelete={onDelete}
          reprocessBusy={reprocessBusy}
          deleteBusy={deleteBusy}
        />
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
