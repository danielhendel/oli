// app/(app)/(tabs)/recovery/index.tsx
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
 * Recovery Hub (tabs)
 * - Weekly strip with selected day.
 * - "+" honors the selected day.
 * - Optional focusYmd param keeps the same day highlighted when returning.
 */
export default function RecoveryHub() {
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

  const { hasLogsMap } = useHasLogsMap("recovery", user?.uid ?? null, displayBaseYmd);

  return (
    <HubScaffold
      title="Recovery"
      onPressPlus={() => {
        const href = { pathname: "/recovery/setup", params: { ymd: selectedYmd } } satisfies Href;
        router.push(href);
      }}
      headerChildren={
        <WeekHeader
          selectedYmd={selectedYmd}
          displayBaseYmd={displayBaseYmd}
          hasLogsMap={hasLogsMap}
          onSelect={(ymd) => {
            setSelectedYmd(ymd);
            const href = { pathname: "/recovery/day/[ymd]", params: { ymd } } satisfies Href;
            router.push(href);
          }}
          onPrevWeek={() => setDisplayBaseYmd((d) => addDaysYMD(d, -7))}
          onNextWeek={() => setDisplayBaseYmd((d) => addDaysYMD(d, +7))}
        />
      }
    >
      <Card variant="elevated" radius="lg" padding="md">
        <Text weight="bold" size="lg">Welcome to the Recovery Hub</Text>
        <Text tone="muted" style={{ marginTop: 6 }}>
          Rings glow neon green on days with recovery logs.{'\n'}
          Tap a day to view details.
        </Text>
      </Card>
    </HubScaffold>
  );
}
