// app/(app)/settings/connections.tsx
import React from "react";
import { Alert, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";

import Card from "@/lib/ui/Card";
import Button from "@/lib/ui/Button";
import { Text } from "@/lib/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";

WebBrowser.maybeCompleteAuthSession();

type Provider = "oura" | "withings";
type ConnState = { provider: Provider; connected: boolean; lastSync?: string };

function readBackendBaseUrl(): string | null {
  const extra = (Constants?.expoConfig as { extra?: { backendBaseUrl?: string } } | undefined)?.extra;
  const url = extra?.backendBaseUrl?.trim();
  return url && /^https?:\/\//i.test(url) ? url : null;
}

async function startConnect(backendBaseUrl: string, uid: string, provider: Provider) {
  // Server API: GET /oauth/:provider/start?uid=abc
  const url = `${backendBaseUrl}/oauth/${provider}/start?uid=${encodeURIComponent(uid)}`;
  // Server handles provider redirect + callback and (on success) can bounce back to FRONTEND redirect.
  // Here we simply open the session.
  return WebBrowser.openAuthSessionAsync(url);
}

async function callResync(backendBaseUrl: string, uid: string, provider: Provider) {
  const res = await fetch(`${backendBaseUrl}/jobs/resync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uid, provider }),
  });
  return res.json() as Promise<{ ok: boolean; error?: string }>;
}

export default function ConnectionsScreen() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const backendBaseUrl = React.useMemo(() => readBackendBaseUrl(), []);
  const [busy, setBusy] = React.useState<Provider | "">("");
  const [states, setStates] = React.useState<ConnState[]>([
    { provider: "oura", connected: false },
    { provider: "withings", connected: false },
  ]);

  const ensureCfg = React.useCallback(() => {
    if (!uid) {
      Alert.alert("Not signed in", "Please sign in first.");
      return false;
    }
    if (!backendBaseUrl) {
      Alert.alert(
        "Backend not configured",
        "backendBaseUrl is missing. Set it in app.config.ts extra.backendBaseUrl.",
      );
      return false;
    }
    return true;
  }, [uid, backendBaseUrl]);

  async function handleConnect(p: Provider) {
    if (busy || !ensureCfg()) return;
    setBusy(p);
    try {
      const result = await startConnect(backendBaseUrl!, uid, p);
      if (result.type === "success") {
        // Optimistic: mark connected; later we’ll check provider tokens in Firestore.
        setStates((arr) => arr.map((x) => (x.provider === p ? { ...x, connected: true } : x)));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      Alert.alert("Connect failed", msg);
    } finally {
      setBusy("");
    }
  }

  async function handleResync(p: Provider) {
    if (busy || !ensureCfg()) return;
    setBusy(p);
    try {
      const json = await callResync(backendBaseUrl!, uid, p);
      if (json.ok) {
        setStates((arr) =>
          arr.map((x) =>
            x.provider === p ? { ...x, lastSync: new Date().toISOString() } : x,
          ),
        );
      } else {
        Alert.alert("Resync failed", json.error ?? "Unknown error");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      Alert.alert("Resync failed", msg);
    } finally {
      setBusy("");
    }
  }

  return (
    <View style={{ padding: 24, gap: 16 }}>
      <Text size="2xl" weight="bold">Connections</Text>

      {states.map((s) => {
        const connecting = busy === s.provider;
        return (
          <Card key={s.provider} variant="elevated" radius="xl" padding="lg">
            <Text weight="bold" style={{ marginBottom: 6 }}>
              {s.provider.toUpperCase()}
            </Text>
            <Text tone={s.connected ? "success" : "muted"}>
              {s.connected ? "Connected" : "Not connected"}
            </Text>
            {s.lastSync && <Text tone="muted">Last resync: {s.lastSync}</Text>}

            <View style={{ height: 12 }} />

            <Button
              label={s.connected ? `Reconnect ${s.provider}` : `Connect ${s.provider}`}
              onPress={() => handleConnect(s.provider)}
              loading={connecting}
              disabled={!uid || connecting}
              accessibilityLabel={`Connect ${s.provider}`}
            />

            <View style={{ height: 8 }} />

            <Button
              variant="ghost"
              label="Resync last 30 days"
              onPress={() => handleResync(s.provider)}
              disabled={!s.connected || connecting || !uid}
              accessibilityLabel={`Resync ${s.provider}`}
            />
          </Card>
        );
      })}
    </View>
  );
}
