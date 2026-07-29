import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import type { DocumentDomain } from "@/lib/contracts";
import { documentDomainSchema } from "@/lib/contracts";
import { useDocumentUploadFlow } from "@/lib/data/documents/useDocumentUploadFlow";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { DocumentUploadFlowContent } from "@/lib/ui/documents/DocumentUploadFlowContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

const DOMAIN_LABELS: Record<DocumentDomain, string> = {
  labs: "Labs",
  scans: "Scans",
  dna: "DNA",
  medical_history: "Medical history",
  medications: "Medications",
  supplements: "Supplements",
  other_health_record: "Health",
};

function parseDomain(raw: unknown): DocumentDomain {
  const parsed = documentDomainSchema.safeParse(raw);
  return parsed.success ? parsed.data : "labs";
}

export default function DocumentUploadScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ domain?: string }>();
  const domain = parseDomain(params.domain);
  const flow = useDocumentUploadFlow({ domain });

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: `Upload ${DOMAIN_LABELS[domain]}`,
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [domain, navigation]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title={`Upload ${DOMAIN_LABELS[domain]}`} hideTitleChrome>
        <DocumentUploadFlowContent
          phase={flow.phase}
          errorMessage={flow.errorMessage}
          domainLabel={DOMAIN_LABELS[domain]}
          onStart={() => void flow.startUpload()}
          onCancel={flow.cancel}
          onReset={flow.reset}
          onDone={() => {
            if (flow.documentId) {
              router.replace(`/(app)/documents/${flow.documentId}`);
              return;
            }
            router.back();
          }}
        />
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
