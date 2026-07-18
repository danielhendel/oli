// lib/ui/timeline/TimelineDayScreen.tsx
// Daily Timeline v1: deterministic single-day experience (shipping path).
// Continuous feed modules remain deferred research and are not imported here.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type RefreshControlProps,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { TabRootScreenHeader } from "@/lib/ui/TabRootScreenHeader";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTimelineDay } from "@/lib/features/timeline/useTimelineDay";
import {
  timelineDayStatusHasVm,
  type TimelineDayContextRow,
  type TimelineDayItem,
  type TimelineDayStatus,
} from "@/lib/features/timeline/types";
import { TimelineRail } from "@/lib/ui/timeline/TimelineRail";
import { TimelineEmptyState } from "@/lib/ui/timeline/TimelineEmptyState";
import { TimelineCalendarButton } from "@/lib/ui/timeline/TimelineCalendarButton";
import { TimelineCalendarSheet } from "@/lib/ui/timeline/TimelineCalendarSheet";
import { TimelineDaySectionHeader } from "@/lib/ui/timeline/TimelineDaySectionHeader";
import { DailyTimelineContextCard } from "@/lib/ui/timeline/DailyTimelineContextCard";
import { TimelineDayIncompleteNotice } from "@/lib/ui/timeline/TimelineDayIncompleteNotice";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export type TimelineDayScreenProps = {
  /** Optional starting day (deep links / [day] route). Defaults to today. */
  initialDay?: string;
};

function daySectionHeaderFor(day: string, today: string) {
  return (
    <TimelineDaySectionHeader
      dayKey={day}
      todayDayKey={today}
      testID="timeline-day-section-header"
    />
  );
}

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

  const daySectionHeader = useMemo(() => daySectionHeaderFor(day, today), [day, today]);

  const listHeader = useMemo(() => {
    const hasVm = timelineDayStatusHasVm(status);
    const incomplete =
      status.status === "partial" && status.history === "incomplete" ? status : null;
    return (
      <View>
        {daySectionHeader}
        {hasVm ? (
          <DailyTimelineContextCard rows={status.vm.context} onPressRow={onPressContext} />
        ) : null}
        {incomplete ? (
          <TimelineDayIncompleteNotice onRetry={() => refetchAll()} />
        ) : null}
      </View>
    );
  }, [daySectionHeader, status, onPressContext, refetchAll]);

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
          {renderBody({
            status,
            isToday,
            listBottomPad,
            refreshControl,
            listHeader,
            daySectionHeader,
            onPressItem,
            onRetry: () => refetchAll(),
            day,
          })}
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

function renderBody(args: {
  status: TimelineDayStatus;
  isToday: boolean;
  listBottomPad: number;
  refreshControl: ReactElement<RefreshControlProps>;
  listHeader: ReactElement;
  daySectionHeader: ReactElement;
  onPressItem: (item: TimelineDayItem) => void;
  onRetry: () => void;
  day: string;
}) {
  const { status } = args;

  if (status.status === "partial" && status.history === "settling") {
    return <LoadingState message="Loading timeline…" />;
  }

  if (status.status === "error") {
    return (
      <ScrollView
        key={`error:${args.day}`}
        style={styles.contentFill}
        contentContainerStyle={[styles.emptyScrollContent, { paddingBottom: args.listBottomPad }]}
      >
        {args.daySectionHeader}
        <ErrorState
          message={status.error}
          requestId={status.requestId}
          onRetry={args.onRetry}
          isContractError={status.reason === "contract"}
        />
      </ScrollView>
    );
  }

  if (!timelineDayStatusHasVm(status)) {
    return <LoadingState message="Loading timeline…" />;
  }

  if (status.vm.isEmpty) {
    return (
      <ScrollView
        key={`empty:${args.day}`}
        style={styles.contentFill}
        contentContainerStyle={[styles.emptyScrollContent, { paddingBottom: args.listBottomPad }]}
        refreshControl={args.refreshControl}
      >
        {args.listHeader}
        <TimelineEmptyState isToday={args.isToday} />
      </ScrollView>
    );
  }

  return (
    <TimelineRail
      key={`rail:${args.day}`}
      items={status.vm.items}
      onPressItem={args.onPressItem}
      refreshControl={args.refreshControl}
      contentBottomPadding={args.listBottomPad}
      ListHeaderComponent={args.listHeader}
    />
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
