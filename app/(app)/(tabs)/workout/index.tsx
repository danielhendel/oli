// app/(app)/(tabs)/workout/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";

import HubScaffold from "@/components/layout/HubScaffold";
import WeekHeader from "@/components/calendar/WeekHeader";

import Card from "@/lib/ui/Card";
import { Text } from "@/lib/ui/Text";
import { toYMD } from "@/lib/util/date";
import { addDaysYMD } from "@/lib/logging/selectors";
import { useAuth } from "@/lib/auth/AuthContext";
import { useHasLogsMap } from "@/lib/logging/hooks";

/**
 * Workout Hub
 * - Sun..Sat strip anchored by displayBaseYmd
 * - selectedYmd controls which day actions apply to
 * - "+" passes selectedYmd so new logs land on that day
 * - optional focusYmd preserves highlight when returning
 */
export default function WorkoutHub() {
  const router = useRouter();
  const { user } = useAuth();
  const { focusYmd } = useLocalSearchParams<{ focusYmd?: string }>();

  const today = useMemo(() => toYMD(new Date()), []);
  const [displayBaseYmd, setDisplayBaseYmd] = useState<string>(today);
  const [selectedYmd, setSelectedYmd] = useState<string>(today);

  // If a screen sends us back with focusYmd, adopt it for both selected & base.
  useEffect(() => {
    if (typeof focusYmd === "string" && focusYmd.length === 10) {
      setSelectedYmd(focusYmd);
      setDisplayBaseYmd(focusYmd);
    }
  }, [focusYmd]);

  // Map of ymd -> hasLogs for the visible week for this user.
  const { hasLogsMap } = useHasLogsMap("workout", user?.uid ?? null, displayBaseYmd);

  return (
    <HubScaffold
      title="Workout"
      onPressPlus={() => {
        const href = { pathname: "/workout/setup", params: { ymd: selectedYmd } } satisfies Href;
        router.push(href);
      }}
      headerChildren={
        <WeekHeader
          selectedYmd={selectedYmd}
          displayBaseYmd={displayBaseYmd}
          hasLogsMap={hasLogsMap}
          onSelect={(ymd) => {
            setSelectedYmd(ymd);
            const href = { pathname: "/workout/day/[ymd]", params: { ymd } } satisfies Href;
            router.push(href);
          }}
          onPrevWeek={() => setDisplayBaseYmd((d) => addDaysYMD(d, -7))}
          onNextWeek={() => setDisplayBaseYmd((d) => addDaysYMD(d, +7))}
        />
      }
    >
      <Card variant="elevated" radius="lg" padding="md">
        <Text weight="bold" size="lg">Welcome to the Workout Hub</Text>
        <Text tone="muted" style={{ marginTop: 6 }}>
          Rings glow neon green on days with workouts.{'\n'}
          Tap a day to view details.
        </Text>
      </Card>
    </HubScaffold>
  );
}
