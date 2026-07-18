// lib/ui/timeline/TimelineDayScreen.tsx
// Daily Timeline v1: deterministic single-day experience (shipping path).
// Continuous feed modules remain deferred research and are not imported here.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTimelineDay } from "@/lib/features/timeline/useTimelineDay";
import type { TimelineDayContextRow, TimelineDayItem } from "@/lib/features/timeline/types";
import { TimelineRail } from "@/lib/ui/timeline/TimelineRail";
import { TimelineEmptyState } from "@/lib/ui/timeline/TimelineEmptyState";
import { TimelineCalendarButton } from "@/lib/ui/timeline/TimelineCalendarButton";
import { TimelineCalendarSheet } from "@/lib/ui/timeline/TimelineCalendarSheet";
import { TimelineDaySectionHeader } from "@/lib/ui/timeline/TimelineDaySectionHeader";
import { DailyTimelineContextCard } from "@/lib/ui/timeline/DailyTimelineContextCard";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export type TimelineDayScreenProps = {
  /** Optional starting day (deep links / [day] route). Defaults to today. */
  initialDay?: string;
};

export function TimelineDayScreen({ initialDay }: TimelineDayScreenProps) {
  const router = useRouter();
  const { user } = useAuth();
  const listBottomPad = useFloatingTabBarScrollPadding(40);
  const today = useMemo(() => getTodayDayKey(), []);
  const [day, setDay] = useState(() =>
    initialDay && YYYY_MM_DD.test(initialDay) ? initialDay : today,
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { status, refetchAll } = useTimelineDay(day);
  const [refreshing, setRefreshing] = useState(false);
  const isToday = day === today;

  // Account switch: clear selected day back to Today (do not clobber cold/deep-link day on mount).
  const uidRef = useRef(user?.uid ?? null);
  useEffect(() => {
    const nextUid = user?.uid ?? null;
    if (uidRef.current !== nextUid) {
      uidRef.current = nextUid;
      setDay(today);
      setCalendarOpen(false);
    }
  }, [user?.uid, today]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      refetchAll({ cacheBust: `timelinePull:${Date.now()}` });
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll]);

  const onPressItem = useCallback(
    (item: TimelineDayItem) => {
      router.push(item.href as never);
    },
    [router],
  );

  const onPressContext = useCallback(
    (row: TimelineDayContextRow) => {
      if (!row.href) return;
      router.push(row.href as never);
    },
    [router],
  );

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8E8E93" />,
    [refreshing, onRefresh],
  );

  const daySectionHeader = useMemo(
    () => (
      <TimelineDaySectionHeader
        dayKey={day}
        todayDayKey={today}
        testID="timeline-day-section-header"
      />
    ),
    [day, today],
  );

  const contextCard = useMemo(() => {
    if (status.status !== "ready") return null;
    return (
      <DailyTimelineContextCard
        rows={status.vm.context}
        onPressRow={onPressContext}
      />
    );
  }, [status, onPressContext]);

  const listHeader = useMemo(
    () => (
      <View>
        {daySectionHeader}
        {contextCard}
      </View>
    ),
    [daySectionHeader, contextCard],
  );

  return (
    <ScreenContainer padded={false}>
      <View style={styles.main}>
        <TabRootScreenHeader
          title="Timeline"
          subtitle="Your day, in order"
          rightSlot={<TimelineCalendarButton onPress={() => setCalendarOpen(true)} />}
        />
        {!isToday ? (
          <Pressable
            onPress={() => setDay(today)}
            accessibilityRole="button"
            accessibilityLabel="Return to Today"
            style={styles.todayControl}
            testID="timeline-return-to-today"
          >
            <Text style={styles.todayControlText}>Today</Text>
          </Pressable>
        ) : null}
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
            <ScrollView
              key={`empty:${day}`}
              style={styles.contentFill}
              contentContainerStyle={[
                styles.emptyScrollContent,
                { paddingBottom: listBottomPad },
              ]}
              refreshControl={refreshControl}
            >
              {listHeader}
              <TimelineEmptyState isToday={isToday} />
            </ScrollView>
          ) : (
            <TimelineRail
              key={`rail:${day}`}
              items={status.vm.items}
              onPressItem={onPressItem}
              refreshControl={refreshControl}
              contentBottomPadding={listBottomPad}
              ListHeaderComponent={listHeader}
            />
          )}
        </View>
      </View>
      <TimelineCalendarSheet
        visible={calendarOpen}
        selectedDay={day}
        onSelectDay={(next) => {
          setDay(next);
          setCalendarOpen(false);
        }}
        onCancel={() => setCalendarOpen(false)}
        onReturnToToday={() => {
          setDay(today);
          setCalendarOpen(false);
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: UI_APP_SCREEN_BG },
  content: { flex: 1, paddingHorizontal: UI_TAB_ROOT_INSET, paddingTop: 4 },
  contentFill: { flex: 1 },
  emptyScrollContent: { flexGrow: 1 },
  todayControl: {
    alignSelf: "center",
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  todayControlText: {
    color: SYSTEM_ACCENT,
    fontSize: 15,
    fontWeight: "600",
  },
});
