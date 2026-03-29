import React, { useLayoutEffect, useMemo } from "react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NutritionLogEntryShell } from "@/lib/ui/nutrition/NutritionLogEntryShell";
import { useNutritionLoggingScreenState } from "@/lib/hooks/useNutritionLoggingScreenState";
import { isValidDayKey } from "@/lib/ui/calendar/types";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

export default function NutritionLogScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string | string[] }>();
  const dayKey = useMemo(() => {
    const raw = params.day;
    const d = typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? "") : "";
    return isValidDayKey(d) ? d : getTodayDayKeyLocal();
  }, [params.day]);

  const state = useNutritionLoggingScreenState(dayKey);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Log nutrition",
    });
  }, [navigation]);

  return (
    <NutritionLogEntryShell
      dayKey={dayKey}
      state={state}
      onLogged={(d) =>
        router.replace({
          pathname: "/(app)/nutrition/day/[day]",
          params: { day: d },
        })
      }
    />
  );
}
