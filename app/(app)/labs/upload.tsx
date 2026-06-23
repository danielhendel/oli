import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { useLabUploadFlow } from "@/lib/data/labs/useLabUploadFlow";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { LabUploadScreenContent } from "@/lib/ui/labs/LabUploadScreenContent";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function LabsUploadScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const flow = useLabUploadFlow();

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
        <LabUploadScreenContent
          state={flow.state}
          documentPickerAvailability={flow.documentPickerAvailability}
          onPickPdf={() => void flow.pickAndUpload()}
          {...(flow.state.uploadId
            ? {
                onViewUpload: () => router.push(`/(app)/labs/uploads/${flow.state.uploadId}`),
              }
            : {})}
          onBackToLabs={() => router.replace("/(app)/labs")}
        />
      </ModuleScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
