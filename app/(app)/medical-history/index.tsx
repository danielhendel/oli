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
        description="Keep a longitudinal record of conditions, procedures, and clinical history in one place."
        emptyTitle="No medical history added yet"
        emptyDescription="Your medical history entries will appear here once added."
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
