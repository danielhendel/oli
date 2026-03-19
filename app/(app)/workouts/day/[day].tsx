import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { useWorkoutDayDetail } from "@/lib/data/workouts/useWorkoutsCalendar";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  formatWorkoutRowSummary,
  formatWorkoutSourceLabel,
  formatWorkoutTimeLabel,
  formatWorkoutTitle,
} from "@/lib/data/workouts/workoutDisplay";

function formatHeaderDate(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dayKey;
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function WorkoutDayScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const dayParam = params.day ?? "";
  const isDayKey = /^\d{4}-\d{2}-\d{2}$/.test(dayParam);

  if (!isDayKey) {
    return (
      <ScreenContainer>
        <ErrorState message="Invalid day parameter" />
      </ScreenContainer>
    );
  }

  const day = dayParam as DayKey;
  const detail = useWorkoutDayDetail(day);

  if (detail.status === "partial") {
    return (
      <ScreenContainer>
        <LoadingState message="Loading workouts…" />
      </ScreenContainer>
    );
  }

  if (detail.status === "error") {
    return (
      <ScreenContainer>
        <ErrorState
          message={detail.error}
          requestId={detail.requestId}
          onRetry={() => {
            // React Navigation will re-render and re-call the hook.
          }}
        />
      </ScreenContainer>
    );
  }

  const workouts = detail.workouts;
  const dailyFacts = detail.dailyFacts;

  if (workouts.length === 0 && !dailyFacts) {
    return (
      <ScreenContainer>
        <EmptyState
          title="No workouts for this day"
          description="When workouts are imported or logged for this day, they will automatically appear here."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Workout Day</Text>
          <Text style={styles.subtitle}>{formatHeaderDate(day)}</Text>
          <Text style={styles.dayKeyLabel}>{day}</Text>
        </View>

        {dailyFacts && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily metrics</Text>
            {dailyFacts.activity && (
              <>
                {typeof dailyFacts.activity.steps === "number" && (
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Steps</Text>
                    <Text style={styles.metricValue}>{Math.round(dailyFacts.activity.steps)}</Text>
                  </View>
                )}
                {typeof dailyFacts.activity.trainingLoad === "number" && (
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Training load</Text>
                    <Text style={styles.metricValue}>{Math.round(dailyFacts.activity.trainingLoad)}</Text>
                  </View>
                )}
              </>
            )}
            {dailyFacts.strength && (
              <>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Strength sessions</Text>
                  <Text style={styles.metricValue}>{dailyFacts.strength.workoutsCount}</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Total sets</Text>
                  <Text style={styles.metricValue}>{dailyFacts.strength.totalSets}</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Total reps</Text>
                  <Text style={styles.metricValue}>{dailyFacts.strength.totalReps}</Text>
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workouts</Text>
          {workouts.length === 0 ? (
            <Text style={styles.placeholder}>No workouts from RawEvents for this day.</Text>
          ) : (
            workouts.map((w) => {
              const timeLabel = formatWorkoutTimeLabel(w.start ?? w.observedAt);
              const duration = typeof w.durationMinutes === "number" ? `${w.durationMinutes} min` : "—";
              const calories = typeof w.calories === "number" ? `${Math.round(w.calories)} kcal` : "—";
              const sourceLabel = formatWorkoutSourceLabel(w);
              const rowSummary = formatWorkoutRowSummary(w);
              return (
                <View key={w.id} style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <Text style={styles.workoutTitle} numberOfLines={1}>
                      {formatWorkoutTitle(w.title)}
                    </Text>
                    <Text style={styles.workoutTime}>{timeLabel}</Text>
                  </View>
                  <View style={styles.kpiRow}>
                    <View style={styles.kpiCell}>
                      <Text style={styles.kpiLabel}>Duration</Text>
                      <Text style={styles.kpiValue}>{duration}</Text>
                    </View>
                    <View style={styles.kpiCell}>
                      <Text style={styles.kpiLabel}>Calories</Text>
                      <Text style={styles.kpiValue}>{calories}</Text>
                    </View>
                  </View>
                  <Text style={styles.workoutSource} numberOfLines={1}>
                    {sourceLabel}
                  </Text>
                  {rowSummary && (
                    <Text style={styles.workoutSummary} numberOfLines={1}>
                      {rowSummary}
                    </Text>
                  )}
                  <View style={styles.cardDivider} />
                  <View style={styles.rowMeta}>
                    <Text style={styles.rowMetaLabel}>Workout id</Text>
                    <Text style={styles.rowMetaValue} numberOfLines={1}>
                      {w.id}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1C1C1E",
  },
  subtitle: {
    fontSize: 15,
    color: "#3C3C43",
    fontWeight: "500",
  },
  dayKeyLabel: {
    fontSize: 13,
    color: "#8E8E93",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  placeholder: {
    fontSize: 14,
    color: "#8E8E93",
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 15,
    color: "#3C3C43",
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  workoutCard: {
    backgroundColor: "#F8F8FA",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    flex: 1,
    marginRight: 8,
  },
  workoutTime: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "500",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
  },
  kpiCell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  kpiLabel: {
    fontSize: 11,
    color: "#8E8E93",
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  workoutSummary: {
    fontSize: 13,
    color: "#6E6E73",
  },
  workoutSource: {
    fontSize: 12,
    color: "#8E8E93",
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E5EA",
  },
  rowMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  rowMetaLabel: {
    fontSize: 12,
    color: "#8E8E93",
  },
  rowMetaValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    color: "#3C3C43",
  },
});
