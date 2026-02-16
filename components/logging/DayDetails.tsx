import React from "react";
import { ScrollView, RefreshControl, View, StyleSheet, Pressable } from "react-native";
import Card from "../../lib/ui/Card";
import { Text } from "../../lib/ui/Text";
import type { UIEvent } from "../../lib/logging/types";
import { useRouter } from "expo-router";

type WorkoutSet = { reps?: number; weight?: number };
type WorkoutExercise = { name?: string; sets?: WorkoutSet[] };
type WorkoutPayload = { exercises?: WorkoutExercise[]; durationMs?: number };

type Props = {
  header?: React.ReactNode;
  loading: boolean;
  error: string | null;
  items: UIEvent[];
  onRefresh: () => Promise<void>;
  /** Extra bottom padding so lists never hide behind sticky bars / home indicator */
  bottomInset?: number;
};

/** Safely coerce unknown → WorkoutPayload without violating exactOptionalPropertyTypes. */
function coerceWorkoutPayload(u: unknown): WorkoutPayload {
  if (!u || typeof u !== "object") return {};
  const o = u as Record<string, unknown>;

  // duration
  const durationMs = typeof o.durationMs === "number" ? o.durationMs : undefined;

  // exercises
  let exercises: WorkoutExercise[] | undefined;
  const rawExs = o.exercises as unknown;
  if (Array.isArray(rawExs)) {
    exercises = rawExs.map((exU) => {
      if (!exU || typeof exU !== "object") return { sets: [] };

      const ex = exU as Record<string, unknown>;
      const rawSets = ex.sets as unknown;

      // sets
      const sets: WorkoutSet[] = Array.isArray(rawSets)
        ? rawSets.map((sU) => {
            const out: WorkoutSet = {};
            if (sU && typeof sU === "object") {
              const s = sU as Record<string, unknown>;
              if (typeof s.reps === "number") out.reps = s.reps;
              if (typeof s.weight === "number") out.weight = s.weight;
            }
            return out;
          })
        : [];

      // build exercise, only include name if it’s a string
      const exOut: WorkoutExercise = { sets };
      if (typeof ex.name === "string") exOut.name = ex.name;
      return exOut;
    });
  }

  // build payload while OMITTING undefined optional fields
  const out: WorkoutPayload = {};
  if (typeof durationMs === "number") out.durationMs = durationMs;
  if (Array.isArray(exercises)) out.exercises = exercises;
  return out;
}

export default function DayDetails({
  header,
  loading,
  error,
  items,
  onRefresh,
  bottomInset = 0,
}: Props) {
  const hasHeader = Boolean(header);
  const router = useRouter();

  /** Navigate to the category detail screen for a given event. */
  function goToDetail(it: UIEvent) {
    // UIEvent.type matches our category segment names: "workout" | "cardio" | "nutrition" | "recovery"
    router.push({ pathname: `/${it.type}/log/[id]`, params: { id: it.id } });
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      stickyHeaderIndices={hasHeader ? [0] : undefined}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
    >
      {hasHeader ? <View>{header}</View> : null}

      <View style={[styles.content, { paddingBottom: 48 + bottomInset }]}>
        {!!error && (
          <Text tone="danger" style={{ marginBottom: 12 }}>
            {error}
          </Text>
        )}

        {items.length === 0 ? (
          <Card variant="elevated" padding="lg" radius="xl" style={{ marginTop: 8 }}>
            <Text>No logs for this day.</Text>
          </Card>
        ) : (
          <View style={{ gap: 12, paddingTop: 8 }}>
            {items.map((it) => {
              // Non-workout cards (e.g., cardio, nutrition, recovery)
              if (it.type !== "workout") {
                return (
                  <Pressable
                    key={it.id}
                    onPress={() => goToDetail(it)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${it.title} details`}
                  >
                    <Card variant="elevated" radius="xl" padding="lg">
                      <Text size="lg" weight="bold">
                        {it.title}
                      </Text>
                      {it.subtitle ? (
                        <Text tone="muted" size="sm" style={{ marginTop: 6 }}>
                          {it.subtitle}
                        </Text>
                      ) : null}
                      <Text tone="muted" size="sm" style={{ marginTop: 8 }}>
                        {it.time}
                      </Text>
                    </Card>
                  </Pressable>
                );
              }

              // Workout cards (show set summary) – also tappable
              const p = coerceWorkoutPayload(it.raw.payload);
              const exs = Array.isArray(p.exercises) ? p.exercises : [];

              return (
                <Pressable
                  key={it.id}
                  onPress={() => goToDetail(it)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${it.title} details`}
                >
                  <Card variant="elevated" radius="xl" padding="lg">
                    <Text size="lg" weight="bold">
                      {it.title}
                    </Text>
                    <Text tone="muted" size="sm" style={{ marginTop: 8 }}>
                      Manual
                    </Text>

                    <View style={{ marginTop: 10, gap: 6 }}>
                      {exs.map((ex, exIdx) => {
                        const sets = Array.isArray(ex.sets) ? ex.sets : [];
                        return sets.map((s, i) => {
                          const n = i + 1;
                          const reps = typeof s.reps === "number" ? s.reps : 0;
                          const wt = typeof s.weight === "number" ? s.weight : undefined;
                          return (
                            <Text key={`${exIdx}-${i}`} size="md">
                              {`Set ${n} — ${reps} reps${wt != null ? ` @ ${wt} kg` : ""}`}
                            </Text>
                          );
                        });
                      })}
                    </View>

                    <Text tone="muted" size="sm" style={{ marginTop: 12 }}>
                      {it.time}
                    </Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16 },
});
