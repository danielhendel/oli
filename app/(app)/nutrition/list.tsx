import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useNavigation, useRouter } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";
import { resolveBodyHistoryQueryWindow } from "@/lib/data/body/bodyHistoryRange";
import { getDeviceTimeZone } from "@/lib/data/body/deviceTimeZone";
import {
  buildNutritionDayLogEntries,
  buildNutritionDayLogRowVm,
  type NutritionDayLogEntry,
} from "@/lib/data/nutrition/nutritionDayLogEntries";
import { useRawEvents } from "@/lib/data/useRawEvents";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { MetricLogRow } from "@/lib/ui/logs/MetricLogRow";
import { MetricLogRowMenu, type MetricLogRowMenuAnchor } from "@/lib/ui/logs/MetricLogRowMenu";
import { EmptyState, ErrorState, LoadingState, ScreenContainer } from "@/lib/ui/ScreenStates";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";

export default function NutritionLogScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { user, initializing } = useAuth();
  const tz = getDeviceTimeZone();
  const { start, end } = useMemo(() => resolveBodyHistoryQueryWindow("5Y"), []);
  const raw = useRawEvents(
    { start, end, kinds: ["nutrition"], includePayload: true, limit: 500 },
    { enabled: !initializing && Boolean(user) },
  );

  const [menuEntry, setMenuEntry] = useState<NutritionDayLogEntry | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MetricLogRowMenuAnchor | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerStyle: { backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} accessibilityLabel="Go back" />,
      title: "Nutrition Log",
    });
  }, [navigation]);

  const rows = useMemo(() => {
    if (raw.status !== "ready") return [];
    return buildNutritionDayLogEntries(raw.data.items, tz).map(buildNutritionDayLogRowVm);
  }, [raw, tz]);

  const refresh = useCallback(() => {
    void raw.refetch();
  }, [raw]);

  const closeMenu = useCallback(() => {
    setMenuEntry(null);
    setMenuAnchor(null);
  }, []);

  const openViewFood = useCallback(
    (dayKey: string) => {
      router.push({ pathname: "/(app)/nutrition/day/[day]", params: { day: dayKey } });
    },
    [router],
  );

  if (initializing || raw.status === "partial") {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG}>
        <LoadingState message="Loading nutrition log…" />
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG}>
        <EmptyState title="Sign in required" description="Sign in to view your nutrition log." />
      </ScreenContainer>
    );
  }

  if (raw.status === "error") {
    return (
      <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG}>
        <ErrorState message={raw.error} requestId={raw.requestId} onRetry={refresh} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor={WORKOUTS_SCREEN_CONTENT_BG} padded={false} edges={["left", "right", "bottom"]}>
      <View style={styles.body} testID="nutrition-log-screen">
        <FlatList
          data={rows}
          keyExtractor={(item) => item.entry.dayKey}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <MetricLogRow
              testID={`nutrition-log-row-${item.entry.dayKey}`}
              dateLabel={item.dateLabel}
              primaryMetric={item.primaryMetric}
              secondaryMetric={item.secondaryMetric}
              accessibilityLabel={item.accessibilityLabel}
              onPress={() => openViewFood(item.entry.dayKey)}
              onOpenMenu={(anchor) => {
                setMenuEntry(item.entry);
                setMenuAnchor(anchor);
              }}
            />
          )}
          ListEmptyComponent={
            <EmptyState title="No nutrition logged yet" description="Daily nutrition recaps will appear here." />
          }
        />
      </View>
      <MetricLogRowMenu
        visible={menuEntry != null}
        anchor={menuAnchor}
        onClose={closeMenu}
        onEdit={() => {
          if (menuEntry) openViewFood(menuEntry.dayKey);
        }}
        editLabel="View Food"
        onDelete={null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
  },
});
