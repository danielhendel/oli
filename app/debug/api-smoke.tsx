// app/debug/api-smoke.tsx
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "../../lib/auth/AuthProvider";
import { apiGetJson, apiPostJsonAuthed, type ApiResult } from "../../lib/api/http";

type UiState = {
  lastAction: string;
  result?: ApiResult;
};

const pretty = (v: unknown): string => {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};

export default function DebugApiSmokeScreen() {
  const { user, getIdToken } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [state, setState] = useState<UiState>({ lastAction: "—" });

  const nowIso = useMemo(() => new Date().toISOString(), []);
  const uid = user?.uid ?? null;

  const runHealthz = async () => {
    setLoading(true);
    setState({ lastAction: "GET /healthz" });
    const res = await apiGetJson("/healthz");
    setState({ lastAction: "GET /healthz", result: res });
    setLoading(false);

    if (!res.ok) Alert.alert("Healthz failed", `${res.error}`);
  };

  const runIngestSample = async (forceRefresh: boolean) => {
    if (!uid) {
      Alert.alert("Not signed in", "Sign in first to run authenticated ingestion.");
      return;
    }

    setLoading(true);
    setState({ lastAction: `POST /ingest/events (forceRefresh=${String(forceRefresh)})` });

    const token = await getIdToken(forceRefresh);
    if (!token) {
      setLoading(false);
      Alert.alert("Token error", "Could not obtain Firebase ID token.");
      return;
    }

    // Keep payload aligned with your API zod schema (provider/kind/occurredAt/sourceId/payload)
    const sample = {
      provider: "manual",
      kind: "steps",
      occurredAt: new Date().toISOString(),
      sourceId: "manual",
      payload: { steps: 1234, note: "debug-api-smoke", at: nowIso },
    };

    // idempotency key allows safe re-tries without creating duplicates (server supports this)
    const idem = `debug-steps-${uid.slice(0, 8)}-${nowIso.slice(0, 10)}`;

    const res = await apiPostJsonAuthed("/ingest/events", sample, token, { idempotencyKey: idem });
    setState({ lastAction: "POST /ingest/events", result: res });
    setLoading(false);

    if (!res.ok) {
      Alert.alert("Ingest failed", `${res.error}`);
    } else {
      Alert.alert("Ingest accepted", `Status ${res.status}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>API Smoke Test</Text>

      <View style={{ padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 12 }}>
        <Text style={{ color: "#555" }}>Signed in UID</Text>
        <Text style={{ fontWeight: "700" }}>{uid ?? "—"}</Text>
        <Text style={{ color: "#555", marginTop: 8 }}>BACKEND_BASE_URL</Text>
        <Text style={{ fontWeight: "700" }}>{process.env.BACKEND_BASE_URL ?? "—"}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={runHealthz}
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
          {loading ? "Running..." : "Run GET /healthz"}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={() => runIngestSample(false)}
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
          {loading ? "Running..." : "Run POST /ingest/events (use cached token)"}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={() => runIngestSample(true)}
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
          {loading ? "Running..." : "Run POST /ingest/events (force refresh token)"}
        </Text>
      </Pressable>

      <View style={{ padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 12 }}>
        <Text style={{ color: "#555" }}>Last action</Text>
        <Text style={{ fontWeight: "700" }}>{state.lastAction}</Text>

        <Text style={{ color: "#555", marginTop: 10 }}>Result</Text>
        <Text selectable style={{ fontSize: 12, lineHeight: 18 }}>
          {state.result ? pretty(state.result) : "—"}
        </Text>
      </View>

      <Text style={{ color: "#777", fontSize: 12, lineHeight: 18 }}>
        Expected results:
        {"\n"}• Healthz: 200 + {"{ ok: true }"}
        {"\n"}• Ingest: 202 Accepted + rawEventId
      </Text>
    </ScrollView>
  );
}
