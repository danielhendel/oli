/**
 * DISCREPANCY (Phase 2G-A audit):
 * Medical History did not exist in the repository under any of
 * medical-history / medicalHistory / MedicalHistory / medical_history.
 * This temporary landing page was added so the Health menu destination is honest
 * and reachable — not a silent omission.
 */
import React, { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "expo-router";

import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { HealthRecordPlaceholderScreen } from "@/lib/ui/health/HealthRecordPlaceholderScreen";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function MedicalHistoryPlaceholderScreen() {
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
        emptyDescription="This record system is not implemented yet. Medical history cannot be stored here until persistence ships."
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
