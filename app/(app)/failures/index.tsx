// app/(app)/failures/index.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useFailuresRange } from "@/lib/data/useFailuresRange";
import { FailureList } from "@/components/failures/FailureList";

const START_OF_TIME_DAY = "1970-01-01";

export default function FailuresScreen() {
  const end = getTodayDayKey();

  const state = useFailuresRange(
    {
      start: START_OF_TIME_DAY,
      end,
      limit: 100,
    },
    {
      mode: "all",
      maxItems: 500,
    },
  );

  const subtitle = useMemo(
    () => "Failures are immutable records of failed, rejected, or missing data. This screen is read-only.",
    [],
  );

  return (
    <ModuleScreenShell title="Failures" subtitle={subtitle}>
      {state.status === "loading" ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Loading failures…</Text>
          <Text style={styles.infoText}>If failures exist, they will be shown.</Text>
        </View>
      ) : null}

      {state.status === "error" ? (
        <View style={[styles.infoCard, styles.errorCard]}>
          <Text style={styles.errorTitle}>Failed to load failures</Text>
          <Text style={styles.infoText}>{state.error}</Text>
          {state.requestId ? <Text style={styles.requestId}>Request ID: {state.requestId}</Text> : null}
        </View>
      ) : null}

      {state.status === "ready" ? <FailureList items={state.data.items} truncated={state.data.truncated} /> : null}
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  infoText: {
    fontSize: 13,
    opacity: 0.75,
  },
  errorCard: {
    backgroundColor: "#FDECEC",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#B00020",
  },
  requestId: {
    fontSize: 12,
    opacity: 0.7,
  },
});
