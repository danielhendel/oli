// app/(app)/fitness-goals.tsx — Dash Weekly Fitness goals editor
import React, { useLayoutEffect } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "expo-router";

import {
  useWeeklyFitnessGoalsEditor,
  WEEKLY_FITNESS_GOALS_EXPLAINER,
} from "@/lib/preferences/useWeeklyFitnessGoalsEditor";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { WeeklyFitnessGoalsForm } from "@/lib/ui/dash/WeeklyFitnessGoalsForm";
import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

export default function FitnessGoalsScreen() {
  const navigation = useNavigation();
  const editor = useWeeklyFitnessGoalsEditor();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Weekly Fitness Goals",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <ScrollView
      contentContainerStyle={styles.pad}
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <WeeklyFitnessGoalsForm
        explainer={WEEKLY_FITNESS_GOALS_EXPLAINER}
        isSignedOut={editor.isSignedOut}
        saving={editor.saving}
        showSavingSpinner={editor.showSavingSpinner}
        showErrorBanner={editor.showErrorBanner}
        errorMessage={editor.errorMessage}
        fieldTexts={editor.fieldTexts}
        errorByField={editor.errorByField}
        onChangeField={editor.setFieldText}
        onSave={() => void editor.save()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI_APP_SCREEN_BG },
  pad: { padding: 16, paddingBottom: 40, gap: 16 },
});
