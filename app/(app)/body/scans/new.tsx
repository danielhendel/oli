import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { isBodyScansV1Enabled } from "@/lib/data/body-scans/bodyScansFlag";
import { useDocumentUploadFlow } from "@/lib/data/documents/useDocumentUploadFlow";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { DocumentUploadFlowContent } from "@/lib/ui/documents/DocumentUploadFlowContent";
import { EmptyState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

/**
 * Scan upload rides the shared Document Ingestion OS flow — same private storage, size
 * limit, and duplicate handling as every other document domain.
 */
export default function BodyScanUploadScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const enabled = isBodyScansV1Enabled();
  const flow = useDocumentUploadFlow({ domain: "scans" });

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Upload scan",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Upload scan" hideTitleChrome>
        {!enabled ? (
          <EmptyState
            title="Body Scans are not available yet"
            description="This section will open once scan support is released."
            testID="body-scan-upload-disabled"
          />
        ) : (
          <DocumentUploadFlowContent
            phase={flow.phase}
            errorMessage={flow.errorMessage}
            domainLabel="Scans"
            onStart={() => void flow.startUpload()}
            onCancel={flow.cancel}
            onReset={flow.reset}
            onDone={() => {
              // A scan shares its id with the uploaded document, so review opens directly.
              if (flow.documentId) {
                router.replace(`/(app)/body/scans/${flow.documentId}/review`);
                return;
              }
              router.back();
            }}
          />
        )}
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
