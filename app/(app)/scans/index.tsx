/**
 * Scans — upload deferred until production upload transport + lifecycle coverage for this domain.
 * Document OS flag may enable Labs; Scans remain an honest placeholder.
 */
import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "expo-router";

import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HealthRecordPlaceholderScreen } from "@/lib/ui/health/HealthRecordPlaceholderScreen";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function ScansScreen() {
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
        emptyDescription="This record system is not implemented yet. Scan and imaging uploads stay disabled until export and deletion coverage for this domain is complete."
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
