/**
 * Devices & integrations — minimal authenticated UI.
 * Withings: status, Connect (OAuth via API URL), Pull (dev-only).
 * No Firebase in screen; all via lib/api authed calls.
 */
import { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from "react-native";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionCard } from "@/lib/ui/ModuleSectionCard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useWithingsPresence } from "@/lib/data/useWithingsPresence";
import { getWithingsConnectUrl, pullWithings } from "@/lib/api/withings";

function getDeviceTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

function formatLastSync(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

export default function DevicesScreen() {
  const { user, initializing, getIdToken } = useAuth();
  const withingsPresence = useWithingsPresence();

  const [connectStatus, setConnectStatus] = useState<
    "idle" | "loading" | "error" | "opened"
  >("idle");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [pullStatus, setPullStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [pullMessage, setPullMessage] = useState<string | null>(null);

  const handleConnectWithings = useCallback(async () => {
    if (!user) return;
    setConnectStatus("loading");
    setConnectError(null);
    const token = await getIdToken(false);
    if (!token) {
      setConnectStatus("error");
      setConnectError("Not signed in");
      return;
    }
    const res = await getWithingsConnectUrl(token);
    if (!res.ok) {
      setConnectStatus("error");
      setConnectError(res.error || `Request failed (${res.status})`);
      return;
    }
    const url = res.json.authorizationUrl;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      setConnectStatus("error");
      setConnectError("Cannot open authorization URL");
      return;
    }
    await Linking.openURL(url);
    setConnectStatus("opened");
  }, [user, getIdToken]);

  const handlePullWithings = useCallback(async () => {
    if (!user) return;
    setPullStatus("loading");
    setPullMessage(null);
    const token = await getIdToken(false);
    if (!token) {
      setPullStatus("error");
      setPullMessage("Not signed in");
      return;
    }
    const idempotencyKey = `withings_pull_${Date.now()}`;
    const res = await pullWithings(token, idempotencyKey, {
      timeZone: getDeviceTimeZone(),
    });
    if (!res.ok) {
      setPullStatus("error");
      setPullMessage(res.error || `Pull failed (${res.status})`);
      return;
    }
    setPullStatus("done");
    setPullMessage(`Wrote ${res.json.written} measure(s). Cursor: ${res.json.cursor}`);
  }, [user, getIdToken]);

  const withingsStatusText =
    withingsPresence.status === "ready"
      ? withingsPresence.data.connected
        ? `Connected${withingsPresence.data.lastMeasurementAt ? ` · Last sync ${formatLastSync(withingsPresence.data.lastMeasurementAt)}` : ""}`
        : "Not connected"
      : withingsPresence.status === "error"
        ? "Error loading status"
        : "Loading…";

  return (
    <ModuleScreenShell title="Devices" subtitle="Wearables & integrations">
      <ModuleSectionCard title="Withings" description="Weight scale sync">
        <View style={styles.row}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={styles.statusValue}>{withingsStatusText}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Connect Withings"
          onPress={handleConnectWithings}
          disabled={initializing || !user || connectStatus === "loading"}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          {connectStatus === "loading" ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Connect Withings</Text>
          )}
        </Pressable>
        {connectStatus === "error" && connectError ? (
          <Text style={styles.errorText}>{connectError}</Text>
        ) : null}
        {connectStatus === "opened" ? (
          <Text style={styles.hintText}>Opened browser — complete sign-in there, then return here.</Text>
        ) : null}

        {__DEV__ ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pull Withings data"
              onPress={handlePullWithings}
              disabled={initializing || !user || pullStatus === "loading"}
              style={({ pressed }) => [styles.button, styles.buttonSecondary, pressed && styles.buttonPressed]}
            >
              {pullStatus === "loading" ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Pull Withings data</Text>
              )}
            </Pressable>
            {pullMessage ? (
              <Text style={pullStatus === "error" ? styles.errorText : styles.hintText}>
                {pullMessage}
              </Text>
            ) : null}
          </>
        ) : null}
      </ModuleSectionCard>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.8,
  },
  statusValue: {
    fontSize: 14,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  buttonSecondary: {
    backgroundColor: "#E5E5EA",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextPrimary: {
    color: "#FFF",
  },
  buttonTextSecondary: {
    color: "#000",
  },
  errorText: {
    fontSize: 14,
    color: "#C00",
  },
  hintText: {
    fontSize: 14,
    opacity: 0.8,
  },
});
