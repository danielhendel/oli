import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { isDocumentIngestionOsV1Enabled } from "@/lib/data/documents/documentIngestionOsFlag";
import { useDocumentUploadFlow } from "@/lib/data/documents/useDocumentUploadFlow";
import { useLabUploadFlow } from "@/lib/data/labs/useLabUploadFlow";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { DocumentUploadFlowContent } from "@/lib/ui/documents/DocumentUploadFlowContent";
import { LabUploadScreenContent } from "@/lib/ui/labs/LabUploadScreenContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function LabsUploadScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const documentOs = isDocumentIngestionOsV1Enabled();
  const legacyFlow = useLabUploadFlow();
  const documentFlow = useDocumentUploadFlow({ domain: "labs" });

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Upload lab PDF",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Upload lab PDF" hideTitleChrome>
        {documentOs ? (
          <DocumentUploadFlowContent
            phase={documentFlow.phase}
            errorMessage={documentFlow.errorMessage}
            terminalStatus={documentFlow.terminalStatus}
            domainLabel="Labs"
            onStart={() => void documentFlow.startUpload()}
            onCancel={documentFlow.cancel}
            onReset={documentFlow.reset}
            onDone={() => {
              if (documentFlow.documentId) {
                router.replace(`/(app)/documents/${documentFlow.documentId}`);
                return;
              }
              router.replace("/(app)/labs");
            }}
          />
        ) : (
          <LabUploadScreenContent
            state={legacyFlow.state}
            documentPickerAvailability={legacyFlow.documentPickerAvailability}
            onPickPdf={() => void legacyFlow.pickAndUpload()}
            {...(legacyFlow.state.uploadId
              ? {
                  onViewUpload: () => router.push(`/(app)/labs/uploads/${legacyFlow.state.uploadId}`),
                }
              : {})}
            onBackToLabs={() => router.replace("/(app)/labs")}
          />
        )}
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
