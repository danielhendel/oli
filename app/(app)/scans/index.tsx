import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "expo-router";

import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HealthRecordPlaceholderScreen } from "@/lib/ui/health/HealthRecordPlaceholderScreen";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function ScansPlaceholderScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: "Scans",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <View style={styles.root}>
      <HealthRecordPlaceholderScreen
        title="Scans"
        description="Store and review imaging, body scans, and diagnostic reports in one place."
        emptyTitle="No scans added yet"
        emptyDescription="Your uploaded scans and imaging reports will appear here."
        icon="scan-outline"
        actionLabel="Add Scan"
        actionDisabled
        testID="scans-placeholder"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
