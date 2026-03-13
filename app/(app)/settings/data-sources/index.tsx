// app/(app)/settings/data-sources/index.tsx — Data Sources Home (Slice 1)
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";
import {
  SLICE_1_SOURCE_IDS,
  SLICE_1_METRICS,
  SOURCE_DISPLAY_NAMES,
  getSourceDisplayName,
  type Slice1SourceId,
} from "@/lib/metrics/dataSourcesConfig";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { useWithingsPresence } from "@/lib/data/useWithingsPresence";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAppleHealthStatus } from "@/lib/api/appleHealth";

type AppleHealthStatus = "loading" | "connected" | "not_connected" | "error";

function useAppleHealthStatusForDataSources(): AppleHealthStatus {
  const { user, getIdToken } = useAuth();
  const [status, setStatus] = useState<AppleHealthStatus>("loading");

  useEffect(() => {
    if (!user) {
      setStatus("not_connected");
      return;
    }
    let cancelled = false;
    (async () => {
      const token = await getIdToken(false);
      if (!token || cancelled) return;
      const res = await getAppleHealthStatus(token, { cacheBust: `ds:${Date.now()}` });
      if (cancelled) return;
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus(res.json.connected ? "connected" : "not_connected");
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getIdToken]);

  return status;
}

function getSourceStatus(
  sourceId: Slice1SourceId,
  withingsConnected: boolean,
  appleHealth: AppleHealthStatus,
  ouraConnected: boolean,
  ouraStatus: "loading" | "ready" | "error",
): string {
  switch (sourceId) {
    case "withings":
      if (withingsConnected) return "Connected";
      return "Not connected";
    case "apple_health":
      if (appleHealth === "loading") return "Loading…";
      if (appleHealth === "connected") return "Connected";
      if (appleHealth === "error") return "Error";
      return "Not connected";
    case "oura":
      if (ouraStatus === "loading") return "Loading…";
      if (ouraStatus === "error") return "Error";
      return ouraConnected ? "Connected" : "Not connected";
    case "manual":
      return "Enabled";
    case "upload":
    case "labs":
      return "Available";
    default:
      return "—";
  }
}

export default function DataSourcesHomeScreen() {
  const router = useRouter();
  const { state } = usePreferences();
  const withingsPresence = useWithingsPresence();
  const ouraPresence = useOuraPresence();
  const appleHealthStatus = useAppleHealthStatusForDataSources();

  const metricSources = state.preferences.metricSources ?? {};
  const withingsConnected = withingsPresence.status === "ready" && withingsPresence.data.connected;
  const ouraConnected = ouraPresence.status === "ready" && ouraPresence.data.connected;
  const ouraStatus = ouraPresence.status === "error" ? "error" : ouraPresence.status === "ready" ? "ready" : "loading";

  const currentSourceForMetric = useCallback(
    (metricId: string) => {
      const s = metricSources[metricId];
      return s ?? null;
    },
    [metricSources],
  );

  const displaySource = (sourceId: string | null) => {
    if (!sourceId) return "Not set";
    return getSourceDisplayName(sourceId);
  };

  const groups = React.useMemo(() => {
    const map = new Map<string, (typeof SLICE_1_METRICS)[number][]>();
    for (const m of SLICE_1_METRICS) {
      const list = map.get(m.group) ?? [];
      list.push(m);
      map.set(m.group, list);
    }
    return Array.from(map.entries()).map(([group, metrics]) => ({ group, metrics }));
  }, []);

  return (
    <ModuleScreenShell title="Data Sources" subtitle="Choose how your health data is collected and displayed.">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Connected sources</Text>
        <View style={styles.section}>
          {SLICE_1_SOURCE_IDS.map((sourceId) => (
            <ModuleSectionLinkRow
              key={sourceId}
              title={SOURCE_DISPLAY_NAMES[sourceId]}
              subtitle={getSourceStatus(sourceId, withingsConnected, appleHealthStatus, ouraConnected, ouraStatus)}
              onPress={() => router.push(`/(app)/settings/data-sources/source/${sourceId}`)}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Source for each metric</Text>
        <View style={styles.section}>
          {groups.map(({ group, metrics }) => (
            <View key={group}>
              <Text style={styles.groupLabel}>{group}</Text>
              {metrics.map((m) => (
                <ModuleSectionLinkRow
                  key={m.id}
                  title={m.label}
                  subtitle={displaySource(currentSourceForMetric(m.id))}
                  onPress={() => router.push(`/(app)/settings/data-sources/metric/${m.id}`)}
                />
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Raw data from all sources is kept. Changing the preferred source only changes which source Oli should prefer
          for this metric.
        </Text>
      </ScrollView>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 20,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  section: { gap: 10 },
  groupLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 2,
  },
  footer: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 24,
    lineHeight: 20,
  },
});
