/**
 * Settings → Devices → Apple Health — consumer access summary.
 * No HealthKit calls on mount. No backfill / repair / RawEvent language.
 */

import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAppleHealthStatus } from "@/lib/api/appleHealth";
import { resolveAppleHealthDeviceConnected } from "@/lib/integrations/appleHealth/resolveAppleHealthDeviceConnected";
import { buildAppleHealthAccessSummaryModel } from "@/lib/integrations/appleHealth/appleHealthAccessSummaryModel";
import { connectAppleHealthForOnboarding } from "@/lib/onboarding/appleHealthOnboardingConnect";
import {
  getAppleHealthBodyLastCheckedAt,
  getAppleHealthConnected,
  getAppleHealthDomainScopes,
} from "@/lib/integrations/appleHealth/storage";
import {
  BODY_APPLE_HEALTH_ICON_COLOR,
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

export function AppleHealthAccessSummaryScreen() {
  const navigation = useNavigation();
  const { user, getIdToken } = useAuth();
  const [appleStatus, setAppleStatus] = useState<AppleHealthStatus>("loading");
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [enabledDomainCount, setEnabledDomainCount] = useState<number | null>(null);
  const [appleConnecting, setAppleConnecting] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: "Apple Health" });
  }, [navigation]);

  const refreshStatus = useCallback(async () => {
    if (!user) {
      setAppleStatus("not_connected");
      setLastCheckedAt(null);
      setEnabledDomainCount(0);
      return;
    }
    try {
      const token = await getIdToken(false);
      if (!token) {
        setAppleStatus("not_connected");
        return;
      }
      const [res, bodyChecked, scopes] = await Promise.all([
        getAppleHealthStatus(token, { cacheBust: `ah-access:${Date.now()}` }),
        getAppleHealthBodyLastCheckedAt().catch(() => null),
        getAppleHealthDomainScopes().catch(() => null),
      ]);
      if (!res.ok) {
        setAppleStatus("error");
        return;
      }
      const effective = await resolveAppleHealthDeviceConnected(res.json.connected);
      setAppleStatus(effective ? "connected" : "not_connected");
      setLastCheckedAt(bodyChecked ?? res.json.lastSyncAt ?? null);
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
  }, [user, getIdToken]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleConnect = useCallback(async () => {
    setAppleConnecting(true);
    try {
      const result = await connectAppleHealthForOnboarding({
        getIdToken,
        ...(user?.uid ? { userUid: user.uid } : {}),
      });
      if (!result.ok) {
        if (result.reason === "permission_denied") {
          Alert.alert(
            "Permission needed",
            "Allow Health access in Settings to connect Apple Health, then try again.",
          );
        } else if (result.reason === "unavailable" || result.reason === "not_ios") {
          Alert.alert("Unavailable", "Apple Health is not available on this device.");
        } else {
          Alert.alert("Connection failed", "Could not connect Apple Health. Try again.");
        }
        return;
      }
      const connected = await getAppleHealthConnected().catch(() => false);
      setAppleStatus(connected ? "connected" : "not_connected");
      await refreshStatus();
    } catch (e) {
      Alert.alert("Connection failed", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAppleConnecting(false);
    }
  }, [getIdToken, user?.uid, refreshStatus]);

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
              <BodyAppleHealthSourceIcon size={22} decorative />
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

        <View style={styles.card} testID="apple-health-data-oli-uses">
          <Text style={styles.sectionEyebrow}>DATA OLI USES</Text>
          {model.dataSections.map((section) => (
            <View key={section.title} style={styles.domainBlock}>
              <Text style={styles.domainTitle}>{section.title}</Text>
              <Text style={styles.domainMetrics}>{section.metricsLine}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card} testID="apple-health-connection-summary">
          <Text style={styles.sectionEyebrow}>CONNECTION</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Last updated</Text>
            <Text style={styles.statusRowValue}>{model.lastUpdatedLabel}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Connected categories</Text>
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
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
    backgroundColor: "rgba(52, 211, 153, 0.14)",
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
  },
  sectionEyebrow: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  domainBlock: {
    gap: 4,
    paddingTop: 4,
  },
  domainTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "700",
  },
  domainMetrics: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 40,
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
    backgroundColor: BODY_APPLE_HEALTH_ICON_COLOR,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryDisabled: { opacity: 0.55 },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: BODY_APPLE_HEALTH_ICON_COLOR,
    fontSize: 15,
    fontWeight: "600",
  },
});
