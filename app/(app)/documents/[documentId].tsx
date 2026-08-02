import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { deleteDocument, reprocessDocument } from "@/lib/api/documents";
import { useAuth } from "@/lib/auth/AuthProvider";
import { markDocumentDeleted } from "@/lib/data/documents/documentListInvalidate";
import { buildDocumentDetailViewModel } from "@/lib/data/documents/documentViewModels";
import { useDocumentDetail } from "@/lib/data/documents/useDocumentDetail";
import { invalidateLabsDerivedViews } from "@/lib/data/labs/labsDerivedInvalidate";
import { isLabsOsV1Enabled } from "@/lib/data/labs/labsOsFlag";
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
  const labsOs = isLabsOsV1Enabled();
  const needsReview =
    labsOs && detail.status === "ready" && detail.data.document.status === "review_needed";
  const [reprocessBusy, setReprocessBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const consumerTitle = useMemo(() => {
    if (detail.status === "ready") {
      return buildDocumentDetailViewModel(detail.data.document).consumerTitle;
    }
    if (detail.status === "not_found") return "Lab report";
    return "Document";
  }, [detail]);

  const goBackToLabUploads = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(app)/labs/uploads");
  }, [router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: consumerTitle,
      headerLeft: () => <HeaderBackButton onPress={goBackToLabUploads} />,
    });
  }, [consumerTitle, goBackToLabUploads, navigation]);

  const onReprocess = useCallback(async () => {
    setReprocessBusy(true);
    try {
      const token = await getIdToken(false);
      if (!token) return;
      // Server awaits extraction; response status is terminal when successful.
      await reprocessDocument(token, documentId, {}, { idempotencyKey: `reprocess-${documentId}-${Date.now()}` });
      const bust = `reprocess-${Date.now()}`;
      detail.refetch({ cacheBust: bust, noStore: true });
      // Force Labs summary/history to refetch corrected projections without app restart.
      invalidateLabsDerivedViews({ reason: "reprocess", documentId });
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
              if (!token) {
                Alert.alert("Couldn’t delete", "Sign in again and retry.", [{ text: "OK" }]);
                return;
              }
              const res = await deleteDocument(token, documentId);
              if (!res.ok) {
                Alert.alert("Couldn’t delete", "Try again in a moment.", [{ text: "Retry", onPress: () => onDelete() }, { text: "Cancel", style: "cancel" }]);
                return;
              }
              // Server confirmed — update caches before navigating away.
              markDocumentDeleted(documentId);
              goBackToLabUploads();
            } finally {
              setDeleteBusy(false);
            }
          })();
        },
      },
    ]);
  }, [documentId, getIdToken, goBackToLabUploads]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title={consumerTitle} hideTitleChrome>
        <DocumentDetailContent
          status={detail.status}
          showReviewLink={needsReview}
          onPressReview={() => router.push(`/(app)/labs/reviews/${documentId}`)}
          {...(detail.status === "error"
            ? { error: detail.error, requestId: detail.requestId, onRetryLoad: () => detail.refetch() }
            : {})}
          {...(detail.status === "ready" ? { document: detail.data.document } : {})}
          onBackToList={goBackToLabUploads}
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
