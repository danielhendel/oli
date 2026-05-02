import React, { useLayoutEffect, useMemo } from "react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
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

  const state = useNutritionLoggingScreenState(dayKey, "quick");

  useLayoutEffect(() => {
    const base = workoutsStackNavigationOptions("detail");
    navigation.setOptions({
      ...base,
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "",
      headerStyle: {
        ...(base.headerStyle as Record<string, unknown>),
        backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
      },
    });
  }, [navigation]);

  return (
    <NutritionLogEntryShell
      state={state}
      onLogged={(d) =>
        router.replace({
          pathname: "/(app)/nutrition",
          params: { logged: "1", day: d },
        })
      }
    />
  );
}
