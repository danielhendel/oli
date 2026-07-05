// lib/ui/timeline/TimelineDayScreen.tsx
// Single-day chronological Timeline. Owns the selected-day state and renders the
// loading / error / empty / ready states. All data access is via useTimelineDay
// (no Firebase, no multi-day timeline request).
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { SettingsGearButton } from "@/lib/ui/SettingsGearButton";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { shiftAnchor } from "@/lib/time/timelineRange";
import { useTimelineDay } from "@/lib/features/timeline/useTimelineDay";
import { useTodayCommand } from "@/lib/hooks/useTodayCommand";
import type { TimelineDayItem } from "@/lib/features/timeline/types";
import { TimelineDateNavigator } from "@/lib/ui/timeline/TimelineDateNavigator";
import { TimelineRail } from "@/lib/ui/timeline/TimelineRail";
import { TimelineEmptyState } from "@/lib/ui/timeline/TimelineEmptyState";
import { TimelinePlanVsActualHeader } from "@/lib/ui/timeline/TimelinePlanVsActualHeader";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export type TimelineDayScreenProps = {
  /** Optional starting day (deep links / [day] route). Defaults to today. */
  initialDay?: string;
};

export function TimelineDayScreen({ initialDay }: TimelineDayScreenProps) {
  const router = useRouter();
  const listBottomPad = useFloatingTabBarScrollPadding(40);

  const today = useMemo(() => getTodayDayKey(), []);
  const [day, setDay] = useState(() =>
    initialDay && YYYY_MM_DD.test(initialDay) ? initialDay : today,
  );

  const { status, refetchAll } = useTimelineDay(day);
  const todayCommand = useTodayCommand(day);

  const [refreshing, setRefreshing] = useState(false);
  const isToday = day === today;

  const planHeader = useMemo(
    () => (
      <TimelinePlanVsActualHeader
        model={todayCommand.model}
        loading={todayCommand.loading}
        isToday={isToday}
      />
    ),
    [todayCommand.model, todayCommand.loading, isToday],
  );

  const goPrev = useCallback(() => setDay((d) => shiftAnchor(d, -1)), []);
  const goNext = useCallback(() => setDay((d) => shiftAnchor(d, 1)), []);
  const goToday = useCallback(() => setDay(today), [today]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      refetchAll({ cacheBust: `timelinePull:${Date.now()}` });
      todayCommand.refetch({ cacheBust: `timelinePull:${Date.now()}` });
    } finally {
      // The hooks update asynchronously; release the control on next tick.
      setRefreshing(false);
    }
  }, [refetchAll, todayCommand.refetch]);

  const onPressItem = useCallback(
    (item: TimelineDayItem) => {
      router.push(item.href as never);
    },
    [router],
  );

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8E8E93" />,
    [refreshing, onRefresh],
  );

  return (
    <ScreenContainer padded={false}>
      <View style={styles.main}>
        <TabRootScreenHeader
          title="Timeline"
          subtitle="Your day, in order"
          rightSlot={<SettingsGearButton />}
        />

        <View style={styles.navWrap}>
          <TimelineDateNavigator
            day={day}
            isToday={isToday}
            onPrev={goPrev}
            onNext={goNext}
            onToday={goToday}
          />
        </View>

        <View style={styles.content}>
          {status.status === "partial" ? (
            <LoadingState message="Loading timeline…" />
          ) : status.status === "error" ? (
            <ErrorState
              message={status.error}
              requestId={status.requestId}
              onRetry={() => refetchAll()}
              isContractError={status.reason === "contract"}
            />
          ) : status.vm.isEmpty ? (
            <View style={styles.contentFill}>
              {planHeader}
              <TimelineEmptyState isToday={isToday} />
            </View>
          ) : (
            <TimelineRail
              items={status.vm.items}
              onPressItem={onPressItem}
              refreshControl={refreshControl}
              contentBottomPadding={listBottomPad}
              ListHeaderComponent={planHeader}
            />
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: UI_APP_SCREEN_BG },
  navWrap: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
  },
  content: { flex: 1, paddingHorizontal: UI_TAB_ROOT_INSET, paddingTop: 4 },
  contentFill: { flex: 1 },
});
