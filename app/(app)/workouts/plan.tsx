/**
 * Placeholder: structured training plan (routes from Workouts overview bottom nav).
 */

import React, { useEffect } from "react";
import { useNavigation } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { EmptyState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function WorkoutsPlanScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <ModuleScreenShell title="Workouts" subtitle="Plan" hideTitleChrome>
      <EmptyState title="Plan" description="Your training plan will appear here." />
    </ModuleScreenShell>
  );
}
