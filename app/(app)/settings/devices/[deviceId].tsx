// app/(app)/settings/devices/[deviceId].tsx — Device detail screens (Withings, Apple Health, Oura)
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useWithingsPresence } from "@/lib/data/useWithingsPresence";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { deriveOuraImportState } from "@/lib/integrations/oura/importState";
import { getWithingsConnectUrl, postWithingsRevoke } from "@/lib/api/withings";
import { getOuraConnectUrl, postOuraRevoke } from "@/lib/api/oura";
import { getAppleHealthStatus } from "@/lib/api/appleHealth";

const WITHINGS_AUTHORIZE_PREFIX = "https://account.withings.com/oauth2_user/authorize2";
const OURA_AUTHORIZE_PREFIX = "https://cloud.ouraring.com/oauth/authorize";

function getWithingsReturnUrl(): string {
  const base = (process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? "").trim();
  if (base && base.startsWith("https://")) {
    return `${base.replace(/\/$/, "")}/integrations/withings/complete`;
  }
  return "com.olifitness.oli://withings-connected";
}

function getOuraReturnUrl(): string {
  const base = (process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? "").trim();
  if (base && base.startsWith("https://")) {
    return `${base.replace(/\/$/, "")}/integrations/oura/complete`;
  }
  return "com.olifitness.oli://oura-connected";
}

type DeviceId = "withings" | "apple_health" | "oura";

type AppleHealthStatus = "loading" | "connected" | "not_connected" | "error";

function DeviceDetailScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const navigation = useNavigation();
  const { user, getIdToken } = useAuth();
  const withingsPresence = useWithingsPresence();
  const ouraPresence = useOuraPresence();

  const [appleStatus, setAppleStatus] = useState<AppleHealthStatus>("loading");
  const [appleLastSyncAt, setAppleLastSyncAt] = useState<string | null>(null);

  const [withingsConnecting, setWithingsConnecting] = useState(false);
  const [withingsRevoking, setWithingsRevoking] = useState(false);
  const [ouraConnecting, setOuraConnecting] = useState(false);
  const [ouraRevoking, setOuraRevoking] = useState(false);

  const id = (deviceId ?? "") as DeviceId;
  const isWithings = id === "withings";
  const isAppleHealth = id === "apple_health";
  const isOura = id === "oura";

  const title = isWithings ? "Withings" : isAppleHealth ? "Apple Health" : isOura ? "Oura" : "Device";

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    if (!isAppleHealth) return;
    let cancelled = false;
    (async () => {
      if (!user) {
        setAppleStatus("not_connected");
        setAppleLastSyncAt(null);
        return;
      }
      try {
        const token = await getIdToken(false);
        if (cancelled) return;
        if (!token) {
          setAppleStatus("not_connected");
          setAppleLastSyncAt(null);
          return;
        }
        const res = await getAppleHealthStatus(token, { cacheBust: `devices-detail:${Date.now()}` });
        if (cancelled) return;
        if (!res.ok) {
          setAppleStatus("error");
          setAppleLastSyncAt(null);
          return;
        }
        setAppleStatus(res.json.connected ? "connected" : "not_connected");
        setAppleLastSyncAt(res.json.lastSyncAt);
      } catch {
        if (!cancelled) {
          setAppleStatus("error");
          setAppleLastSyncAt(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAppleHealth, user, getIdToken]);

  const handleConnectWithings = useCallback(async () => {
    const token = await getIdToken(true);
    if (!token) {
      Alert.alert("Sign in required", "Please sign in to connect Withings.");
      return;
    }
    setWithingsConnecting(true);
    try {
      const res = await getWithingsConnectUrl(token);
      if (!res.ok) {
        const message = res.error ?? `Request failed (${res.status})`;
        Alert.alert("Connection failed", message);
        return;
      }
      if (!res.json?.url) {
        Alert.alert("Connection failed", "No authorization URL returned.");
        return;
      }
      const authUrl = res.json.url;
      if (!authUrl.startsWith(WITHINGS_AUTHORIZE_PREFIX)) {
        Alert.alert("Connection failed", "Invalid authorization URL host.");
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(authUrl, getWithingsReturnUrl());
      if (result.type === "cancel") {
        Alert.alert("Cancelled", "Withings connection was cancelled.");
        return;
      }
      await withingsPresence.refetch();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      Alert.alert("Connection failed", message);
    } finally {
      setWithingsConnecting(false);
    }
  }, [getIdToken, withingsPresence]);

  const handleDisconnectWithings = useCallback(() => {
    Alert.alert(
      "Disconnect Withings?",
      "Your existing weight and body composition data from Withings will remain. You can connect again later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            const token = await getIdToken(false);
            if (!token) return;
            setWithingsRevoking(true);
            try {
              const res = await postWithingsRevoke(token);
              if (!res.ok) {
                Alert.alert("Disconnect failed", res.error ?? "Could not disconnect Withings.");
                return;
              }
              await withingsPresence.refetch({ cacheBust: `withingsRevoke:devices-detail:${Date.now()}` });
            } finally {
              setWithingsRevoking(false);
            }
          },
        },
      ],
    );
  }, [getIdToken, withingsPresence]);

  const handleConnectOura = useCallback(async () => {
    const token = await getIdToken(true);
    if (!token) {
      Alert.alert("Sign in required", "Please sign in to connect Oura.");
      return;
    }
    setOuraConnecting(true);
    try {
      const res = await getOuraConnectUrl(token);
      if (!res.ok) {
        const message = res.error ?? `Request failed (${res.status})`;
        Alert.alert("Connection failed", message);
        return;
      }
      if (!res.json?.url) {
        Alert.alert("Connection failed", "No authorization URL returned.");
        return;
      }
      const authUrl = res.json.url;
      console.log("[OURA_AUTH_URL]", authUrl);
      if (!authUrl.startsWith(OURA_AUTHORIZE_PREFIX)) {
        Alert.alert("Connection failed", "Invalid authorization URL host.");
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(authUrl, getOuraReturnUrl());
      console.log("[OURA_AUTH_RESULT]", JSON.stringify(result));
      if (result.type === "cancel") {
        Alert.alert("Cancelled", "Oura connection was cancelled.");
        return;
      }
      await ouraPresence.refetch();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      Alert.alert("Connection failed", message);
    } finally {
      setOuraConnecting(false);
    }
  }, [getIdToken, ouraPresence]);

  const handleDisconnectOura = useCallback(() => {
    Alert.alert(
      "Disconnect Oura?",
      "Your existing sleep and HRV data from Oura will remain. You can connect again later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            const token = await getIdToken(false);
            if (!token) return;
            setOuraRevoking(true);
            try {
              const res = await postOuraRevoke(token);
              if (!res.ok) {
                Alert.alert("Disconnect failed", res.error ?? "Could not disconnect Oura.");
                return;
              }
              await ouraPresence.refetch({ cacheBust: `ouraRevoke:devices-detail:${Date.now()}` });
            } finally {
              setOuraRevoking(false);
            }
          },
        },
      ],
    );
  }, [getIdToken, ouraPresence]);

  if (!isWithings && !isAppleHealth && !isOura) {
    return (
      <ModuleScreenShell title="Device" subtitle="Unknown device">
        <View style={styles.body}>
          <Text style={styles.description}>Unknown device.</Text>
        </View>
      </ModuleScreenShell>
    );
  }

  const withingsConnected =
    withingsPresence.status === "ready" && withingsPresence.data.connected;

  const ouraConnected = ouraPresence.status === "ready" && ouraPresence.data.connected;
  const mainStatus =
    isWithings && withingsPresence.status === "error"
      ? "Error"
      : isWithings
        ? withingsConnected
          ? "Connected"
          : "Not connected"
        : isOura
          ? ouraPresence.status === "error"
            ? "Error"
            : ouraPresence.status === "ready"
              ? ouraConnected
                ? "Connected"
                : "Not connected"
              : "Loading…"
          : appleStatus === "loading"
            ? "Loading…"
            : appleStatus === "connected"
              ? "Connected"
              : appleStatus === "error"
                ? "Error"
                : "Not connected";

  const withingsCopy =
    "Connect your Withings scale to sync weight and body composition into Oli. When connected, Oli can import new readings and historical data.";

  const appleCopy =
    "Apple Health can provide workouts, steps, activity, HRV, and sleep from your iPhone and Apple Watch. Manage Apple Health permissions and sync from Workouts.";

  const ouraCopy =
    "Oura can provide sleep and HRV data. When connected and synced, Oli uses Oura for sleep duration and heart rate variability in your record.";

  const metricsForWithings = ["Weight", "Body fat"];
  const metricsForAppleHealth = ["Steps", "Activity minutes", "HRV", "Sleep duration"];
  const metricsForOura = ["Sleep duration", "HRV"];

  return (
    <ModuleScreenShell title={title} hideTitleChrome>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{title}</Text>
            {isWithings ? (
              <Pressable
                style={[
                  styles.togglePill,
                  withingsConnected ? styles.togglePillOn : styles.togglePillOff,
                  withingsConnecting || withingsRevoking ? styles.togglePillDisabled : null,
                ]}
                disabled={withingsConnecting || withingsRevoking}
                accessibilityRole="button"
                accessibilityLabel={
                  withingsConnected
                    ? withingsRevoking
                      ? "Disconnecting Withings…"
                      : "Turn off Withings"
                    : withingsConnecting
                      ? "Connecting Withings…"
                      : "Turn on Withings"
                }
                onPress={withingsConnected ? handleDisconnectWithings : handleConnectWithings}
              >
                <Text
                  style={[
                    styles.toggleLabel,
                    withingsConnected ? styles.toggleLabelOn : styles.toggleLabelOff,
                  ]}
                >
                  {withingsConnected ? "On" : "Off"}
                </Text>
              </Pressable>
            ) : isOura ? (
              <Pressable
                style={[
                  styles.togglePill,
                  ouraConnected ? styles.togglePillOn : styles.togglePillOff,
                  ouraConnecting || ouraRevoking ? styles.togglePillDisabled : null,
                ]}
                disabled={ouraConnecting || ouraRevoking}
                accessibilityRole="button"
                accessibilityLabel={
                  ouraConnected
                    ? ouraRevoking
                      ? "Disconnecting Oura…"
                      : "Turn off Oura"
                    : ouraConnecting
                      ? "Connecting Oura…"
                      : "Turn on Oura"
                }
                onPress={ouraConnected ? handleDisconnectOura : handleConnectOura}
              >
                <Text
                  style={[
                    styles.toggleLabel,
                    ouraConnected ? styles.toggleLabelOn : styles.toggleLabelOff,
                  ]}
                >
                  {ouraConnected ? "On" : "Off"}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.rowStatus}>{mainStatus}</Text>
            )}
          </View>
        </View>

        {/* No separate Withings action box; main toggle above is the primary control. */}

        <View style={styles.body}>
          <Text style={styles.description}>
            {isWithings ? withingsCopy : isOura ? ouraCopy : appleCopy}
          </Text>
        </View>

        <View style={styles.group}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Metrics this device provides</Text>
          </View>
          {(isWithings ? metricsForWithings : isOura ? metricsForOura : metricsForAppleHealth).map((m) => (
            <View key={m} style={styles.metricRow}>
              <Text style={styles.metricText}>{m}</Text>
            </View>
          ))}
        </View>

        {(isWithings &&
          withingsPresence.status === "ready" &&
          (withingsPresence.data.backfill?.status === "running" || withingsPresence.data.lastMeasurementAt)) ||
        (isAppleHealth && appleLastSyncAt) ||
        (isOura &&
          ouraPresence.status === "ready" &&
          (ouraPresence.data.lastRefreshAt ?? ouraPresence.data.lastSyncAt)) ? (
          <View style={styles.group}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sync status</Text>
            </View>
            {isWithings && withingsPresence.status === "ready" ? (
              <>
                {withingsPresence.data.backfill?.status === "running" && (
                  <View style={styles.metricRow}>
                    <Text style={styles.metricText}>Importing history from Withings…</Text>
                  </View>
                )}
                {withingsPresence.data.lastMeasurementAt && (
                  <View style={styles.metricRow}>
                    <Text style={styles.metricText}>
                      Last measurement:{" "}
                      {new Date(withingsPresence.data.lastMeasurementAt).toLocaleString()}
                    </Text>
                  </View>
                )}
              </>
            ) : isAppleHealth && appleLastSyncAt ? (
              <View style={styles.metricRow}>
                <Text style={styles.metricText}>
                  Last new Apple Health data: {new Date(appleLastSyncAt).toLocaleString()}
                </Text>
              </View>
            ) : isOura && ouraPresence.status === "ready" ? (
              <>
                <View style={styles.metricRow}>
                  <Text style={styles.metricText}>
                    Last refresh:{" "}
                    {new Date(
                      ouraPresence.data.lastRefreshAt ?? ouraPresence.data.lastSyncAt ?? "",
                    ).toLocaleString()}
                  </Text>
                </View>
                {ouraPresence.data.lastSnapshotAt ? (
                  <View style={styles.metricRow}>
                    <Text style={styles.metricText}>
                      Last sleep/readiness data:{" "}
                      {new Date(ouraPresence.data.lastSnapshotAt).toLocaleString()}
                    </Text>
                  </View>
                ) : ouraPresence.data.connected ? (
                  (() => {
                    const importState = deriveOuraImportState({
                      connected: ouraPresence.data.connected,
                      lastSnapshotAt: ouraPresence.data.lastSnapshotAt,
                      backfillStatus: ouraPresence.data.backfillStatus,
                    });
                    if (importState === "running") {
                      return (
                        <View style={styles.metricRow}>
                          <Text style={styles.metricText}>Importing Oura history…</Text>
                        </View>
                      );
                    }
                    if (importState === "failed") {
                      return (
                        <View style={styles.metricRow}>
                          <Text style={styles.metricText}>
                            Oura import failed. Pull to refresh and try again.
                          </Text>
                        </View>
                      );
                    }
                    if (importState === "connected_no_data") {
                      const completedNoSnapshot =
                        ouraPresence.data.backfillStatus === "completed" && !ouraPresence.data.lastSnapshotAt;
                      return (
                        <View style={styles.metricRow}>
                          <Text style={styles.metricText}>
                            {completedNoSnapshot
                              ? "Connected, but no usable sleep/readiness data was imported."
                              : "Waiting for Oura data import."}
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })()
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  group: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  rowStatus: {
    fontSize: 15,
    color: "#8E8E93",
  },
  togglePill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  togglePillOn: {
    backgroundColor: "rgba(52,199,89,0.12)",
    borderColor: "#34C759",
  },
  togglePillOff: {
    backgroundColor: "#F2F2F7",
    borderColor: "#D1D1D6",
  },
  togglePillDisabled: {
    opacity: 0.7,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  toggleLabelOn: {
    color: "#34C759",
  },
  toggleLabelOff: {
    color: "#3C3C43",
  },
  primaryButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#007AFF",
    borderRadius: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#8E8E93",
  },
  secondaryButtonDisabled: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3C3C43",
  },
  body: {
    paddingHorizontal: 4,
  },
  description: {
    fontSize: 14,
    color: "#3C3C43",
    lineHeight: 20,
  },
  sectionHeader: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
  },
  metricRow: {
    paddingVertical: 6,
  },
  metricText: {
    fontSize: 15,
    color: "#1C1C1E",
  },
});

export default DeviceDetailScreen;

