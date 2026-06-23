import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { useLabUploads } from "@/lib/data/labs/useLabUploads";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { LabUploadsListContent } from "@/lib/ui/labs/LabUploadsListContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function LabsUploadsListScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const uploads = useLabUploads();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Lab uploads",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <View style={styles.root}>
      <ModuleScreenShell title="Lab uploads" hideTitleChrome>
        <LabUploadsListContent
          status={uploads.status}
          {...(uploads.status === "error"
            ? { error: uploads.error, requestId: uploads.requestId, onRetry: () => uploads.refetch() }
            : {})}
          {...(uploads.status === "ready" ? { items: uploads.data.items } : {})}
          onPressUpload={(uploadId) => router.push(`/(app)/labs/uploads/${uploadId}`)}
        />
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
