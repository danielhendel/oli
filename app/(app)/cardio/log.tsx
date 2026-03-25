/**
 * Cardio manual logging: Apple Health supplies HK workouts; structured manual entry
 * uses the same journal patterns as Strength when added later.
 */

import React, { useEffect } from "react";
import { useNavigation } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { EmptyState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function CardioLogScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <ModuleScreenShell title="Cardio" subtitle="Log" hideTitleChrome>
      <EmptyState
        title="Cardio logging"
        description="Runs, rides, and other cardio sessions from Apple Health sync automatically. Structured manual cardio entry will use this spot when shipped."
      />
    </ModuleScreenShell>
  );
}
