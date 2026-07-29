/**
 * Medical History — upload deferred until lifecycle coverage is complete for this domain.
 */
import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "expo-router";

import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HealthRecordPlaceholderScreen } from "@/lib/ui/health/HealthRecordPlaceholderScreen";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function MedicalHistoryScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("module"),
      title: "Medical History",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <View style={styles.root}>
      <HealthRecordPlaceholderScreen
        title="Medical History"
        emptyDescription="This record system is not implemented yet. Medical history uploads stay disabled until export and deletion coverage for this domain is complete."
        icon="clipboard-outline"
        actionLabel="Add Medical History"
        actionDisabled
        testID="medical-history-placeholder"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
