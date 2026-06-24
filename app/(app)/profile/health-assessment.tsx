// app/(app)/profile/health-assessment.tsx
import React, { useLayoutEffect } from "react";
import { useNavigation } from "expo-router";

import { HealthAssessmentScreen } from "@/lib/ui/health-assessment/HealthAssessmentScreen";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export default function HealthAssessmentRoute() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: "Health Assessment",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return <HealthAssessmentScreen />;
}
