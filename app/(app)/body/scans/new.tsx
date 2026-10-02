import React, { useLayoutEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import type { BodyScanType } from "@/lib/contracts";
import {
  bodyScanCategoryDefinition,
  isBodyScanCategoryType,
} from "@/lib/data/body-scans/bodyScanCategoryCatalog";
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
 *
 * Optional `scanType` query prefills the product category (and associated method on ingest).
 */
export default function BodyScanUploadScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ scanType?: string | string[] }>();
  const enabled = isBodyScansV1Enabled();

  const preferredScanType = useMemo((): BodyScanType | undefined => {
    const raw = Array.isArray(params.scanType) ? params.scanType[0] : params.scanType;
    if (typeof raw !== "string" || !isBodyScanCategoryType(raw)) return undefined;
    return raw;
  }, [params.scanType]);

  const category = preferredScanType
    ? bodyScanCategoryDefinition(preferredScanType)
    : null;

  const flow = useDocumentUploadFlow({
    domain: "scans",
    ...(preferredScanType ? { preferredScanType } : {}),
  });

  const title = category ? category.addLabel : "Upload scan";
  const domainLabel = category ? category.label : "Scans";

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title,
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation, title]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title={title} hideTitleChrome>
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
            domainLabel={domainLabel}
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
