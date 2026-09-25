/**
 * DEV-only Body Scan Cache Test harness.
 *
 * Exercises the real iOS preview + account-scoped cache lifecycle with a synthetic
 * on-device PDF. Backend-independent. Fail-closed outside development.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";
import {
  clearBodyScanCacheDevStatus,
  getLastBodyScanCacheDevStatus,
  isBodyScanCacheDevToolsEnabled,
  serializeBodyScanCacheDevStatus,
  subscribeBodyScanCacheDevStatus,
  type BodyScanCacheDevStatus,
} from "@/lib/data/body-scans/bodyScanCacheDevStatus";
import {
  harnessClearAllBodyScanCaches,
  harnessClearCurrentAccountCache,
  harnessCreateAbandonedPartial,
  harnessCreateCurrentAccountTestCache,
  harnessCreateInvalidSyntheticReport,
  harnessCreateStaleSyntheticPdf,
  harnessOpenSyntheticReport,
  harnessRunStaleSweep,
  harnessSimulatePostDeleteLocalCleanup,
} from "@/lib/data/body-scans/bodyScanCacheLifecycleHarness";

type ActionId =
  | "open"
  | "invalid"
  | "stale"
  | "partial"
  | "sweep"
  | "accountCache"
  | "postDelete"
  | "clearAccount"
  | "clearAll";

export default function BodyScanCacheTestScreen() {
  const { user } = useAuth();
  const [status, setStatus] = useState<BodyScanCacheDevStatus | null>(getLastBodyScanCacheDevStatus());
  const [busy, setBusy] = useState<ActionId | null>(null);

  useEffect(() => subscribeBodyScanCacheDevStatus(setStatus), []);

  if (!isBodyScanCacheDevToolsEnabled()) {
    return <Redirect href="/" />;
  }

  const run = useCallback(
    async (id: ActionId, action: () => Promise<BodyScanCacheDevStatus | null>) => {
      setBusy(id);
      try {
        const next = await action();
        if (next) setStatus(next);
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const uid = user?.uid ?? "";

  return (
    <ScrollView contentContainerStyle={styles.root} testID="body-scan-cache-test">
      <Text style={styles.title}>Body Scan Cache Test</Text>
      <Text style={styles.note}>
        Development only. Uses a synthetic on-device PDF. No personal report, no Body Scan
        backend upload, no staging Body Scan deployment.
      </Text>
      {!uid ? (
        <Text style={styles.warn}>Sign in with a development account to run account-scoped actions.</Text>
      ) : null}

      <Action
        label="Open synthetic report"
        busy={busy === "open"}
        disabled={!uid || busy != null}
        onPress={() => void run("open", () => harnessOpenSyntheticReport({ userId: uid }))}
        testID="harness-open-synthetic"
      />
      <Action
        label="Create invalid synthetic report"
        busy={busy === "invalid"}
        disabled={!uid || busy != null}
        onPress={() => void run("invalid", () => harnessCreateInvalidSyntheticReport({ userId: uid }))}
        testID="harness-invalid"
      />
      <Action
        label="Create stale synthetic PDF"
        busy={busy === "stale"}
        disabled={!uid || busy != null}
        onPress={() => void run("stale", () => harnessCreateStaleSyntheticPdf({ userId: uid }))}
        testID="harness-stale"
      />
      <Action
        label="Create abandoned partial"
        busy={busy === "partial"}
        disabled={!uid || busy != null}
        onPress={() => void run("partial", () => harnessCreateAbandonedPartial({ userId: uid }))}
        testID="harness-partial"
      />
      <Action
        label="Run stale sweep"
        busy={busy === "sweep"}
        disabled={busy != null}
        onPress={() => void run("sweep", () => harnessRunStaleSweep())}
        testID="harness-sweep"
      />
      <Action
        label="Create current-account test cache"
        busy={busy === "accountCache"}
        disabled={!uid || busy != null}
        onPress={() => void run("accountCache", () => harnessCreateCurrentAccountTestCache({ userId: uid }))}
        testID="harness-account-cache"
      />
      <Action
        label="Simulate post-delete local cache cleanup"
        busy={busy === "postDelete"}
        disabled={!uid || busy != null}
        onPress={() => void run("postDelete", () => harnessSimulatePostDeleteLocalCleanup({ userId: uid }))}
        testID="harness-post-delete"
      />
      <Action
        label="Clear current account Body Scan cache"
        busy={busy === "clearAccount"}
        disabled={!uid || busy != null}
        onPress={() => void run("clearAccount", () => harnessClearCurrentAccountCache({ userId: uid }))}
        testID="harness-clear-account"
      />
      <Action
        label="Clear all Body Scan preview caches"
        busy={busy === "clearAll"}
        disabled={busy != null}
        onPress={() => void run("clearAll", () => harnessClearAllBodyScanCaches())}
        testID="harness-clear-all"
      />

      <View style={styles.statusCard} testID="harness-status">
        <Text style={styles.statusTitle}>Safe status</Text>
        <Text style={styles.statusBody} selectable>
          {status ? serializeBodyScanCacheDevStatus(status) : "No status yet"}
        </Text>
        {status ? (
          <Text style={styles.meta}>observedAtMs: {status.observedAtMs}</Text>
        ) : null}
        <Pressable
          onPress={() => {
            clearBodyScanCacheDevStatus();
            setStatus(null);
          }}
          style={styles.clearStatus}
          testID="harness-clear-status"
        >
          <Text style={styles.clearStatusLabel}>Clear status</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Action(props: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  busy: boolean;
  testID: string;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      accessibilityRole="button"
      style={[styles.action, props.disabled && styles.actionDisabled]}
      testID={props.testID}
    >
      <Text style={styles.actionLabel}>{props.busy ? "Working…" : props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: "700" },
  note: { fontSize: 13, color: "#555", marginBottom: 6 },
  warn: { fontSize: 13, color: "#8B4513", marginBottom: 6 },
  action: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  actionDisabled: { opacity: 0.45 },
  actionLabel: { fontSize: 15, fontWeight: "600" },
  statusCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    gap: 8,
    backgroundColor: "#f7f7f7",
  },
  statusTitle: { fontWeight: "700", fontSize: 14 },
  statusBody: { fontFamily: "Menlo", fontSize: 11 },
  meta: { fontSize: 11, color: "#666" },
  clearStatus: { paddingVertical: 8 },
  clearStatusLabel: { fontSize: 14, fontWeight: "600", color: "#007AFF" },
});
