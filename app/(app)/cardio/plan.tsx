/**
 * Placeholder: cardio plan (mirrors Strength plan route shape).
 */

import React, { useEffect } from "react";
import { useNavigation } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { EmptyState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function CardioPlanScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <ModuleScreenShell title="Cardio" subtitle="Plan" hideTitleChrome>
      <EmptyState title="Plan" description="Your cardio plan will appear here." />
    </ModuleScreenShell>
  );
}
