/**
 * Settings → Devices → Apple Health — consumer sync-scope management.
 * No HealthKit calls on mount. No backfill / repair / RawEvent language.
 * Toggles control Oli sync scope, not native permission truth.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAppleHealthStatus } from "@/lib/api/appleHealth";
import { resolveAppleHealthDeviceConnected } from "@/lib/integrations/appleHealth/resolveAppleHealthDeviceConnected";
import { buildAppleHealthAccessSummaryModel } from "@/lib/integrations/appleHealth/appleHealthAccessSummaryModel";
import { connectAppleHealthForOnboarding } from "@/lib/onboarding/appleHealthOnboardingConnect";
import {
  APPLE_HEALTH_METRIC_SYNC_GROUPS,
  type AppleHealthMetricSyncId,
} from "@/lib/integrations/appleHealth/appleHealthMetricSyncScope";
import {
  enableAllAppleHealthMetricSyncScopes,
  resolveMetricSyncMap,
  setAppleHealthMetricSyncEnabled,
} from "@/lib/integrations/appleHealth/appleHealthMetricSyncController";
import {
  getAppleHealthBodyLastCheckedAt,
  getAppleHealthConnected,
  getAppleHealthDomainScopes,
} from "@/lib/integrations/appleHealth/storage";
import { AppleHealthScopeToggle } from "@/lib/ui/body/AppleHealthScopeToggle";
import {
  BODY_APPLE_HEALTH_ICON_COLOR_STRONG,
  BodyAppleHealthSourceIcon,
} from "@/lib/ui/body/BodyAppleHealthSourceIcon";
import {
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_DASH_CATEGORY_CARD_RADIUS,
  UI_DURATION_STATUS_RECOMMENDED_TEXT,
  UI_SCREEN_BG,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

type AppleHealthStatus = "loading" | "connected" | "not_connected" | "error";

const EMPTY_METRIC_MAP = Object.fromEntries(
  APPLE_HEALTH_METRIC_SYNC_GROUPS.flatMap((g) => g.metrics.map((m) => [m.id, false])),
) as Record<AppleHealthMetricSyncId, boolean>;

export function AppleHealthAccessSummaryScreen() {
  const navigation = useNavigation();
  const auth = useAuth();
  const uid = auth.user?.uid;
  const getIdTokenRef = React.useRef(auth.getIdToken);
  getIdTokenRef.current = auth.getIdToken;
  const [appleStatus, setAppleStatus] = useState<AppleHealthStatus>("loading");
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [enabledDomainCount, setEnabledDomainCount] = useState<number | null>(null);
  const [appleConnecting, setAppleConnecting] = useState(false);
  const [metricMap, setMetricMap] =
    useState<Record<AppleHealthMetricSyncId, boolean>>(EMPTY_METRIC_MAP);
  const [togglingId, setTogglingId] = useState<AppleHealthMetricSyncId | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: "Apple Health" });
  }, [navigation]);

  const refreshStatus = useCallback(async () => {
    if (!uid) {
      setAppleStatus("not_connected");
      setLastCheckedAt(null);
      setEnabledDomainCount(0);
      setMetricMap(EMPTY_METRIC_MAP);
      return;
    }
    try {
      const token = await getIdTokenRef.current(false);
      if (!token) {
        setAppleStatus("not_connected");
        return;
      }
      const [res, bodyChecked, scopes, metrics] = await Promise.all([
        getAppleHealthStatus(token, { cacheBust: `ah-access:${Date.now()}` }),
        getAppleHealthBodyLastCheckedAt().catch(() => null),
        getAppleHealthDomainScopes().catch(() => null),
        resolveMetricSyncMap(uid).catch(() => EMPTY_METRIC_MAP),
      ]);
      if (!res.ok) {
        setAppleStatus("error");
        return;
      }
      const effective = await resolveAppleHealthDeviceConnected(res.json.connected);
      setAppleStatus(effective ? "connected" : "not_connected");
      setLastCheckedAt(bodyChecked ?? res.json.lastSyncAt ?? null);
      setMetricMap(metrics);
      if (scopes) {
        const count = [scopes.body, scopes.activity, scopes.workouts, scopes.cardioVitals].filter(
          Boolean,
        ).length;
        setEnabledDomainCount(count);
      } else {
        setEnabledDomainCount(effective ? null : 0);
      }
    } catch {
      setAppleStatus("error");
    }
  }, [uid]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleConnect = useCallback(async () => {
    setAppleConnecting(true);
    try {
      const result = await connectAppleHealthForOnboarding({
        getIdToken: (force) => getIdTokenRef.current(force),
        ...(uid ? { userUid: uid } : {}),
      });
      if (!result.ok) {
        if (result.reason === "permission_denied") {
          Alert.alert(
            "Permission needed",
            "Allow Health access in Settings to connect Apple Health, then try again.",
            [
              { text: "Not now", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => {
                  void Linking.openSettings();
                },
              },
            ],
          );
        } else if (result.reason === "unavailable" || result.reason === "not_ios") {
          Alert.alert("Unavailable", "Apple Health is not available on this device.");
        } else {
          Alert.alert("Connection failed", "Could not connect Apple Health. Try again.");
        }
        return;
      }
      if (uid) {
        await enableAllAppleHealthMetricSyncScopes(uid).catch(() => undefined);
      }
      const connected = await getAppleHealthConnected().catch(() => false);
      setAppleStatus(connected ? "connected" : "not_connected");
      await refreshStatus();
    } catch (e) {
      Alert.alert("Connection failed", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAppleConnecting(false);
    }
  }, [uid, refreshStatus]);

  const handleToggle = useCallback(
    async (metricId: AppleHealthMetricSyncId, enabled: boolean) => {
      if (!uid) return;
      if (appleStatus !== "connected" && enabled) {
        Alert.alert(
          "Connect Apple Health",
          "Connect Apple Health first to choose which data Oli can sync.",
          [
            { text: "Not now", style: "cancel" },
            {
              text: "Connect",
              onPress: () => {
                void handleConnect();
              },
            },
          ],
        );
        return;
      }
      setTogglingId(metricId);
      setMetricMap((prev) => ({ ...prev, [metricId]: enabled }));
      try {
        const result = await setAppleHealthMetricSyncEnabled({ uid, metricId, enabled });
        if (!result.ok) {
          const restored = await resolveMetricSyncMap(uid).catch(() => null);
          if (restored) setMetricMap(restored);
          return;
        }
        await refreshStatus();
      } finally {
        setTogglingId(null);
      }
    },
    [uid, appleStatus, handleConnect, refreshStatus],
  );

  const model = buildAppleHealthAccessSummaryModel({
    connected: appleStatus === "connected",
    lastSuccessfulSyncAtIso: lastCheckedAt,
    enabledDomainCount,
  });

  const statusLabel =
    appleStatus === "loading"
      ? "Loading…"
      : appleStatus === "connected"
        ? "Connected"
        : appleStatus === "error"
          ? "Needs attention"
          : "Not connected";

  return (
    <ModuleScreenShell title="Apple Health" hideTitleChrome>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        testID="apple-health-access-summary"
      >
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.sourceTitleRow}>
              <BodyAppleHealthSourceIcon accent="strong" size={22} decorative />
              <Text style={styles.sourceTitle} accessibilityRole="header">
                Apple Health
              </Text>
            </View>
            <View
              style={[
                styles.statusChip,
                appleStatus === "connected" ? styles.statusChipConnected : null,
              ]}
              accessibilityLabel={`Status ${statusLabel}`}
            >
              {appleStatus === "loading" ? (
                <ActivityIndicator color={UI_TEXT_SECONDARY} />
              ) : (
                <Text style={styles.statusChipText}>{statusLabel}</Text>
              )}
            </View>
          </View>
          <Text style={styles.intro}>{model.intro}</Text>
        </View>

        {APPLE_HEALTH_METRIC_SYNC_GROUPS.map((group) => (
          <View
            key={group.id}
            style={styles.card}
            testID={`apple-health-scope-group-${group.id}`}
          >
            <Text style={styles.sectionEyebrow}>{group.title.toUpperCase()}</Text>
            {group.metrics.map((metric, index) => (
              <View key={metric.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.metricRow} testID={`apple-health-metric-row-${metric.id}`}>
                  <Text style={styles.metricLabel}>{metric.displayName}</Text>
                  <AppleHealthScopeToggle
                    metricLabel={metric.displayName}
                    on={metricMap[metric.id] === true}
                    disabled={togglingId === metric.id || appleStatus === "loading"}
                    onValueChange={(next) => {
                      void handleToggle(metric.id, next);
                    }}
                    testID={`apple-health-metric-toggle-${metric.id}`}
                  />
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.card} testID="apple-health-connection-summary">
          <Text style={styles.sectionEyebrow}>CONNECTION</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Last updated</Text>
            <Text style={styles.statusRowValue}>{model.lastUpdatedLabel}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Categories in use</Text>
            <Text style={styles.statusRowValue}>{model.connectedCategoriesLabel}</Text>
          </View>
        </View>

        {model.showConnectAll ? (
          <Pressable
            style={[styles.primaryBtn, appleConnecting ? styles.primaryDisabled : null]}
            disabled={appleConnecting}
            onPress={() => {
              void handleConnect();
            }}
            accessibilityRole="button"
            accessibilityLabel="Connect all supported Apple Health data"
            testID="apple-health-connect-all"
          >
            <Text style={styles.primaryBtnText}>
              {appleConnecting ? "Connecting…" : "Connect all supported data"}
            </Text>
          </Pressable>
        ) : null}

        {appleStatus === "error" || appleStatus === "connected" ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              void Linking.openSettings();
            }}
            accessibilityRole="button"
            accessibilityLabel="Open iOS Health access settings"
            accessibilityHint="Opens system Settings to manage Apple Health permissions"
            testID="apple-health-system-settings"
          >
            <Text style={styles.secondaryBtnText}>iOS Health access</Text>
          </Pressable>
        ) : null}

        {appleStatus === "error" ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              void refreshStatus();
            }}
            accessibilityRole="button"
            accessibilityLabel="Review Apple Health access"
          >
            <Text style={styles.secondaryBtnText}>Review access</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: UI_SCREEN_BG },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: UI_DASH_CATEGORY_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  sourceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  sourceTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "700",
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    minHeight: 28,
    justifyContent: "center",
  },
  statusChipConnected: {
    backgroundColor: "rgba(52, 199, 89, 0.16)",
  },
  statusChipText: {
    color: UI_DURATION_STATUS_RECOMMENDED_TEXT,
    fontSize: 12,
    fontWeight: "700",
  },
  intro: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
  },
  sectionEyebrow: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 52,
    paddingVertical: 4,
  },
  metricLabel: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
    paddingVertical: 4,
  },
  statusRowLabel: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  statusRowValue: {
    color: UI_TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_CARD_ELEVATED_BORDER,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: BODY_APPLE_HEALTH_ICON_COLOR_STRONG,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryDisabled: { opacity: 0.55 },
  primaryBtnText: {
    color: "rgb(255, 255, 255)",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: BODY_APPLE_HEALTH_ICON_COLOR_STRONG,
    fontSize: 15,
    fontWeight: "600",
  },
});
