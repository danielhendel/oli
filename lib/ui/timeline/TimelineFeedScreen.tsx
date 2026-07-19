// lib/ui/timeline/TimelineFeedScreen.tsx
// Continuous Timeline feed UI (requires EXPO_PUBLIC_TIMELINE_FEED=1 + live API).
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { TimelinePresentationItem } from "@oli/contracts";
import { ScreenContainer, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useTimelineFeed } from "@/lib/features/timeline/useTimelineFeed";
import { TimelineFeedList } from "@/lib/ui/timeline/TimelineFeedList";
import { TimelineEmptyState } from "@/lib/ui/timeline/TimelineEmptyState";
import { TimelineCalendarButton } from "@/lib/ui/timeline/TimelineCalendarButton";
import { TimelineCalendarSheet } from "@/lib/ui/timeline/TimelineCalendarSheet";
import { TimelineDaySectionHeader } from "@/lib/ui/timeline/TimelineDaySectionHeader";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type TimelineFeedScreenProps = {
  initialDay?: string;
};

export function TimelineFeedScreen({ initialDay }: TimelineFeedScreenProps) {
  const router = useRouter();
  const listBottomPad = useFloatingTabBarScrollPadding(40);
  const today = useMemo(() => getTodayDayKey(), []);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const feed = useTimelineFeed(initialDay);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      feed.refetch({ cacheBust: `timelinePull:${Date.now()}` });
    } finally {
      setRefreshing(false);
    }
  }, [feed]);

  const onPressItem = useCallback(
    (item: TimelinePresentationItem) => {
      router.push(item.destination as never);
    },
    [router],
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
          {feed.status.status === "partial" ? (
            <LoadingState message="Loading timeline…" />
          ) : feed.status.status === "error" ? (
            <ErrorState
              message={feed.status.error}
              requestId={feed.status.requestId}
              onRetry={() => feed.refetch()}
              isContractError={feed.status.reason === "contract"}
            />
          ) : feed.status.isEmpty ? (
            <ScrollView
              key={`feed-empty:${feed.selectedDay}`}
              style={styles.contentFill}
              contentContainerStyle={[
                styles.emptyScrollContent,
                { paddingBottom: listBottomPad },
              ]}
            >
              <TimelineDaySectionHeader
                dayKey={feed.selectedDay}
                todayDayKey={today}
                testID="timeline-day-section-header"
              />
              <TimelineEmptyState isToday={feed.selectedDay === today} />
            </ScrollView>
          ) : (
            <>
              {feed.ensureDayError ? (
                <Text style={styles.ensureError} accessibilityRole="text">
                  {feed.ensureDayError}
                </Text>
              ) : null}
              <TimelineFeedList
                sections={feed.status.sections}
                onPressItem={onPressItem}
                onStartReached={feed.loadOlder}
                loadingMore={feed.status.loadingMore}
                refreshing={refreshing}
                onRefresh={onRefresh}
                contentBottomPadding={listBottomPad}
                scrollTarget={feed.scrollTarget}
                onScrollTargetSettled={feed.onScrollTargetSettled}
              />
            </>
          )}
        </View>
      </View>
      <TimelineCalendarSheet
        visible={calendarOpen}
        selectedDay={feed.selectedDay}
        onSelectDay={(next) => {
          feed.jumpToDay(next);
          setCalendarOpen(false);
        }}
        onCancel={() => setCalendarOpen(false)}
        onReturnToToday={() => {
          feed.returnToToday();
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
  ensureError: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 6,
  },
});
