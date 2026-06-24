// app/(app)/profile/health-baseline.tsx
import React, { useLayoutEffect } from "react";
import { useNavigation } from "expo-router";

import { HealthBaselineScreen } from "@/lib/ui/health-baseline/HealthBaselineScreen";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function HealthBaselineRoute() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Health Baseline",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return <HealthBaselineScreen />;
}
