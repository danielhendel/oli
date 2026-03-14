// app/(app)/settings/devices.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, AppState } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useWithingsPresence } from "@/lib/data/useWithingsPresence";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAppleHealthStatus } from "@/lib/api/appleHealth";
import { postOuraPullNow } from "@/lib/api/oura";
import { getAppleHealthConnected } from "@/lib/integrations/appleHealth/storage";
import { getWithingsLastKnownConnected } from "@/lib/integrations/withings/storage";
import {
  getOuraLastKnownConnected,
  getOuraLastCheckedAt,
  setOuraLastCheckedAt,
} from "@/lib/integrations/oura/storage";
import { shouldRun, nowIso } from "@/lib/sync/throttle";

type AppleHealthStatus = "loading" | "connected" | "not_connected" | "error";

/** Throttle: do not call pull-now again if last attempt was within this many ms. */
const OURA_AUTO_MIN_MS = 15 * 60 * 1000;

function DevicesScreen() {
  const router = useRouter();
  const presence = useWithingsPresence();
  const { user, getIdToken } = useAuth();

  const [appleStatus, setAppleStatus] = useState<AppleHealthStatus>("loading");
  const appleFetchSeq = useRef(0);
  const [withingsHydrated, setWithingsHydrated] = useState<boolean | null>(null);
  const ouraPresence = useOuraPresence();
  const [ouraHydrated, setOuraHydrated] = useState<boolean | null>(null);

  const backfill = presence.status === "ready" ? presence.data.backfill : undefined;
  const withingsConnected =
    presence.status === "ready" && presence.data.connected;

  const fetchAppleStatus = useCallback(async () => {
    const seq = ++appleFetchSeq.current;
    if (!user) {
      if (seq === appleFetchSeq.current) setAppleStatus("not_connected");
      return;
    }
    try {
      const token = await getIdToken(false);
      if (seq !== appleFetchSeq.current) return;
      if (!token) {
        setAppleStatus("not_connected");
        return;
      }
      const res = await getAppleHealthStatus(token, { cacheBust: `devices:${Date.now()}` });
      if (seq !== appleFetchSeq.current) return;
      if (!res.ok) {
        setAppleStatus("error");
        return;
      }
      setAppleStatus(res.json.connected ? "connected" : "not_connected");
    } catch {
      if (seq === appleFetchSeq.current) setAppleStatus("error");
    }
  }, [user, getIdToken]);

  const maybeAutoOuraPullNow = useCallback(
    async (reason: "focus" | "foreground") => {
      if (!user) return;
      if (!(ouraPresence.status === "ready" && ouraPresence.data?.connected)) return;
      const last = await getOuraLastCheckedAt().catch(() => null);
      if (!shouldRun(last, OURA_AUTO_MIN_MS)) return;
      const token = await getIdToken(false);
      if (!token) return;
      const idempotencyKey = `ouraPullNow:auto:${reason}:${Date.now()}`;
      try {
        await postOuraPullNow(token, { idempotencyKey });
      } finally {
        await setOuraLastCheckedAt(nowIso()).catch(() => undefined);
        ouraPresence.refetch({ cacheBust: `ouraAuto:${reason}:${Date.now()}` });
      }
    },
    [user, ouraPresence, getIdToken],
  );

  useFocusEffect(
    useCallback(() => {
      getWithingsLastKnownConnected().then((connected) => {
        setWithingsHydrated(connected);
      });
      getOuraLastKnownConnected().then((connected) => {
        setOuraHydrated(connected);
      });
      presence.refetch();
      ouraPresence.refetch();
      void fetchAppleStatus();
      void maybeAutoOuraPullNow("focus");
    }, [presence, ouraPresence, fetchAppleStatus, maybeAutoOuraPullNow]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void maybeAutoOuraPullNow("foreground");
    });
    return () => sub.remove();
  }, [maybeAutoOuraPullNow]);

  useEffect(() => {
    void fetchAppleStatus();
  }, [fetchAppleStatus]);

  useEffect(() => {
    getAppleHealthConnected().then((connected) => {
      setAppleStatus((prev) => (prev === "loading" ? (connected ? "connected" : "not_connected") : prev));
    });
  }, []);

  useEffect(() => {
    getWithingsLastKnownConnected().then((connected) => {
      setWithingsHydrated(connected);
    });
    getOuraLastKnownConnected().then((connected) => {
      setOuraHydrated(connected);
    });
  }, []);

  const appleStatusLine =
    appleStatus === "loading"
      ? "Loading…"
      : appleStatus === "connected"
        ? "On"
        : appleStatus === "error"
          ? "Error"
          : "Off";

  const withingsStatusSummary =
    presence.status === "error"
      ? "Error"
      : presence.status === "ready"
        ? withingsConnected
          ? "On"
          : "Off"
        : withingsHydrated !== null
          ? withingsHydrated
            ? "On"
            : "Off"
          : "Loading…";

  const ouraConnected = ouraPresence.status === "ready" && ouraPresence.data.connected;
  const ouraStatusSummary =
    ouraPresence.status === "error"
      ? "Error"
      : ouraPresence.status === "ready"
        ? ouraConnected
          ? "On"
          : "Off"
        : ouraHydrated !== null
          ? ouraHydrated
            ? "On"
            : "Off"
          : "Loading…";

  return (
    <ModuleScreenShell title="Devices" hideTitleChrome>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.listGroup}>
          <Pressable
            style={styles.row}
            onPress={() => router.push("/(app)/settings/devices/withings")}
            accessibilityRole="button"
            accessibilityLabel="Withings device settings"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="scale-outline" size={22} color="#3C3C43" style={styles.rowIcon} />
              <Text style={styles.rowTitle}>Withings</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowStatus}>{withingsStatusSummary}</Text>
              <Text style={styles.rowChevron}>›</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.row}
            onPress={() => router.push("/(app)/settings/devices/apple_health")}
            accessibilityRole="button"
            accessibilityLabel="Apple Health settings"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="heart-outline" size={22} color="#FF2D55" style={styles.rowIcon} />
              <Text style={styles.rowTitle}>Apple Health</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowStatus}>
                {appleStatusLine}
              </Text>
              <Text style={styles.rowChevron}>›</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.row}
            onPress={() => router.push("/(app)/settings/devices/oura")}
            accessibilityRole="button"
            accessibilityLabel="Oura device settings"
          >
            <View style={styles.rowLeft}>
              <Ionicons name="moon-outline" size={22} color="#3C3C43" style={styles.rowIcon} />
              <Text style={styles.rowTitle}>Oura</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowStatus}>{ouraStatusSummary}</Text>
              <Text style={styles.rowChevron}>›</Text>
            </View>
          </Pressable>
        </View>

        {backfill?.status === "running" && (
          <Text style={styles.footerHint}>
            Withings is importing history in the background.
          </Text>
        )}
      </ScrollView>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6E6E73",
  },
  listGroup: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 16,
    color: "#1C1C1E",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowStatus: {
    fontSize: 15,
    color: "#8E8E93",
  },
  rowChevron: {
    fontSize: 20,
    color: "#C7C7CC",
  },
  footerHint: {
    marginTop: 16,
    fontSize: 13,
    color: "#6E6E73",
  },
});

export default DevicesScreen;

