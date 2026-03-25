/**
 * Placeholder: quick-create cardio session (mirrors Strength create route shape).
 */

import React, { useEffect } from "react";
import { useNavigation } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { EmptyState } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function CardioCreateScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <ModuleScreenShell title="Cardio" subtitle="Create" hideTitleChrome>
      <EmptyState title="Create" description="Build a cardio template or quick session here." />
    </ModuleScreenShell>
  );
}
