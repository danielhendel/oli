// app/(app)/settings/devices.tsx
import { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useWithingsPresence } from "@/lib/data/useWithingsPresence";
import { getWithingsConnectUrl } from "@/lib/api/withings";
import { useAuth } from "@/lib/auth/AuthProvider";

const WITHINGS_AUTHORIZE_PREFIX = "https://account.withings.com/oauth2_user/authorize2";

/** Completion bridge URL (HTTPS) so auth session auto-closes; fallback to deep link if no backend URL. */
function getWithingsReturnUrl(): string {
  const base = (process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? "").trim();
  if (base && base.startsWith("https://")) {
    return `${base.replace(/\/$/, "")}/integrations/withings/complete`;
  }
  return "com.olifitness.oli://withings-connected";
}

// Debug switch (set to true only when capturing logs)
const DEBUG_WITHINGS_OAUTH = false;

function DevicesScreen() {
  const presence = useWithingsPresence();
  const { getIdToken } = useAuth();
  const [connecting, setConnecting] = useState(false);

  const backfill = presence.status === "ready" ? presence.data.backfill : undefined;
  const statusLine =
    presence.status === "error"
      ? "Error loading status"
      : presence.status === "ready"
        ? presence.data.connected
          ? "Status: Connected"
          : "Status: Not connected"
        : "Status: Loading…";

  const handleConnectWithings = useCallback(async () => {
    const token = await getIdToken(true);
    if (!token) {
      Alert.alert("Sign in required", "Please sign in to connect Withings.");
      return;
    }

    setConnecting(true);
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

      // Host/prefix guard: fail closed if auth URL is not the expected Withings authorize endpoint
      if (!authUrl.startsWith(WITHINGS_AUTHORIZE_PREFIX)) {
        Alert.alert("Connection failed", "Invalid authorization URL host.");
        return;
      }

      // Debug: prove what redirect_uri is actually being used (do NOT log tokens)
      if (DEBUG_WITHINGS_OAUTH) {
        try {
          const u = new URL(authUrl);
          const redirectUri = u.searchParams.get("redirect_uri");
          const clientId = u.searchParams.get("client_id");
          const scope = u.searchParams.get("scope");
          console.log("WITHINGS_OAUTH_DEBUG", {
            authorizeHost: u.host,
            redirectUri,
            redirectHost: redirectUri ? new URL(redirectUri).host : null,
            redirectPath: redirectUri ? new URL(redirectUri).pathname : null,
            scope,
            // client_id is not a secret, but still keep logs minimal
            clientIdPrefix: clientId ? clientId.slice(0, 6) : null,
          });
        } catch (e) {
          console.log("WITHINGS_OAUTH_DEBUG_PARSE_ERROR", e instanceof Error ? e.message : String(e));
        }
      }

      const returnUrl = getWithingsReturnUrl();
      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);

      // With the HTTPS completion bridge, some platforms return "dismiss" even when the flow succeeded.
      // Fail-closed: always refetch server truth unless the user explicitly cancelled.
      if (result.type === "cancel") {
        Alert.alert("Cancelled", "Withings connection was cancelled.");
        return;
      }

      await presence.refetch();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      Alert.alert("Connection failed", message);
    } finally {
      setConnecting(false);
    }
  }, [getIdToken, presence]);

  return (
    <ModuleScreenShell title="Devices" subtitle="Wearables & integrations">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Withings</Text>
        <Text style={styles.statusLine}>{statusLine}</Text>

        <Pressable
          style={[styles.connectButton, connecting && styles.connectButtonDisabled]}
          onPress={handleConnectWithings}
          disabled={connecting}
          accessibilityState={{ busy: connecting }}
          accessibilityLabel="Connect Withings"
        >
          <Text style={styles.connectButtonText}>
            {connecting ? "Connecting…" : "Connect Withings"}
          </Text>
        </Pressable>

        {backfill?.status === "running" ? (
          <Text style={styles.backfillLine}>
            Importing history… {typeof backfill.processedCount === "number" ? `(${backfill.processedCount} events)` : ""}
          </Text>
        ) : backfill?.status === "complete" ? (
          <Text style={styles.backfillLine}>History imported.</Text>
        ) : backfill?.status === "error" && backfill?.lastError ? (
          <View style={styles.backfillErrorBlock}>
            <Text style={styles.backfillErrorText}>{backfill.lastError.message}</Text>
            <Text style={styles.backfillHint}>Retry is run by the system; you can refetch status.</Text>
          </View>
        ) : presence.status === "ready" && presence.data.connected && !presence.data.hasRecentData ? (
          <Text style={styles.backfillLine}>No weight data from device yet. Import runs automatically.</Text>
        ) : null}

        {DEBUG_WITHINGS_OAUTH ? (
          <Text style={styles.debugHint}>
            Debug on: check Metro logs for WITHINGS_OAUTH_DEBUG.
          </Text>
        ) : null}
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
  statusLine: { fontSize: 15, color: "#3C3C43" },
  connectButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#007AFF",
    borderRadius: 10,
  },
  connectButtonDisabled: { opacity: 0.7 },
  connectButtonText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  backfillLine: { fontSize: 14, color: "#3C3C43" },
  backfillErrorBlock: { gap: 4 },
  backfillErrorText: { fontSize: 14, color: "#B00020", fontWeight: "600" },
  backfillHint: { fontSize: 12, color: "#6B7280" },
  debugHint: { fontSize: 12, color: "#6B7280" },
});

export default DevicesScreen;

