import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import type { DocumentDomain } from "@/lib/contracts";
import { documentDomainSchema } from "@/lib/contracts";
import { useDocuments } from "@/lib/data/documents/useDocuments";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { DocumentListContent } from "@/lib/ui/documents/DocumentListContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

function parseDomain(raw: unknown): DocumentDomain | undefined {
  const parsed = documentDomainSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export default function DocumentsListScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ domain?: string }>();
  const domain = parseDomain(params.domain);
  const documents = useDocuments(domain ? { domain } : {});

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: domain === "labs" ? "Lab documents" : domain === "scans" ? "Scan documents" : "Documents",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [domain, navigation]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Documents" hideTitleChrome>
        <DocumentListContent
          status={documents.status}
          {...(documents.status === "error"
            ? { error: documents.error, requestId: documents.requestId, onRetry: () => documents.refetch() }
            : {})}
          {...(documents.status === "ready" ? { items: documents.data.items } : {})}
          emptyTitle="No documents yet"
          emptyDescription="Upload a supported file to store it securely."
          onPressDocument={(documentId) => router.push(`/(app)/documents/${documentId}`)}
        />
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
