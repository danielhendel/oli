// lib/ui/timeline/TimelineDayScreen.tsx
// Timeline v1 chrome: calendar jump, no Plan vs actual, no day arrows.
// Continuous feed loads only when EXPO_PUBLIC_TIMELINE_FEED=1 (live API required).
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useTimelineDay } from "@/lib/features/timeline/useTimelineDay";
import type { TimelineDayItem } from "@/lib/features/timeline/types";
import { TimelineRail } from "@/lib/ui/timeline/TimelineRail";
import { TimelineEmptyState } from "@/lib/ui/timeline/TimelineEmptyState";
import { TimelineCalendarButton } from "@/lib/ui/timeline/TimelineCalendarButton";
import { TimelineCalendarSheet } from "@/lib/ui/timeline/TimelineCalendarSheet";
import { TimelineDaySectionHeader } from "@/lib/ui/timeline/TimelineDaySectionHeader";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
const FEED_ENABLED = process.env.EXPO_PUBLIC_TIMELINE_FEED === "1";

export type TimelineDayScreenProps = {
  /** Optional starting day (deep links / [day] route). Defaults to today. */
  initialDay?: string;
};

export function TimelineDayScreen(props: TimelineDayScreenProps) {
  if (FEED_ENABLED) {
    // Lazy require keeps Auth/firebase out of the default single-day path (Jest + Metro).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TimelineFeedScreen } = require("@/lib/ui/timeline/TimelineFeedScreen") as typeof import("@/lib/ui/timeline/TimelineFeedScreen");
    return <TimelineFeedScreen {...props} />;
  }
  return <TimelineDayScreenLegacy {...props} />;
}

function TimelineDayScreenLegacy({ initialDay }: TimelineDayScreenProps) {
  const router = useRouter();
  const listBottomPad = useFloatingTabBarScrollPadding(40);
  const today = useMemo(() => getTodayDayKey(), []);
  const [day, setDay] = useState(() =>
    initialDay && YYYY_MM_DD.test(initialDay) ? initialDay : today,
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { status, refetchAll } = useTimelineDay(day);
  const [refreshing, setRefreshing] = useState(false);
  const isToday = day === today;

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

  return (
    <ScreenContainer padded={false}>
      <View style={styles.main}>
        <TabRootScreenHeader
          title="Timeline"
          subtitle="Your day, in order"
          rightSlot={<TimelineCalendarButton onPress={() => setCalendarOpen(true)} />}
        />
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
              {daySectionHeader}
              <TimelineEmptyState isToday={isToday} />
            </ScrollView>
          ) : (
            <TimelineRail
              key={`rail:${day}`}
              items={status.vm.items}
              onPressItem={onPressItem}
              refreshControl={refreshControl}
              contentBottomPadding={listBottomPad}
              ListHeaderComponent={daySectionHeader}
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
});
