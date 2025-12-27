// app/debug/api-smoke.tsx
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { getEnv } from "@/lib/env";
import { apiGetJson, apiPostJsonAuthed, type ApiResult } from "@/lib/api/http";

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
  const env = useMemo(() => getEnv(), []);
  const { user, getIdToken } = useAuth();

  const uid = user?.uid ?? null;

  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<UiState>({ lastAction: "—" });

  const runHealth = async () => {
    setLoading(true);
    setState({ lastAction: "GET /health" });
    const res = await apiGetJson("/health");
    setState({ lastAction: "GET /health", result: res });
    setLoading(false);
  };

  const ingestSampleSteps = async (forceRefresh: boolean) => {
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

    const nowIso = new Date().toISOString();

    const sample = {
      provider: "manual",
      kind: "steps",
      occurredAt: nowIso,
      sourceId: "manual",
      payload: { steps: 1234, note: "debug-api-smoke", at: nowIso },
    };

    const idem = `debug-steps-${uid.slice(0, 8)}-${nowIso.slice(0, 10)}`;

    const res = await apiPostJsonAuthed("/ingest/events", sample, token, { idempotencyKey: idem });
    setState({ lastAction: "POST /ingest/events", result: res });
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "900" }}>API Smoke</Text>

      <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, gap: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: "800" }}>Wiring</Text>
        <Text>Base URL: {env.EXPO_PUBLIC_BACKEND_BASE_URL}</Text>
        <Text>Firebase Project ID: {env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}</Text>
        <Text>Signed in UID: {uid ? `${uid.slice(0, 8)}…` : "—"}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={runHealth}
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center" }}>GET /health</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={() => ingestSampleSteps(false)}
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center" }}>
          POST /ingest/events (steps)
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={() => ingestSampleSteps(true)}
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center" }}>
          POST /ingest/events (steps) – forceRefresh token
        </Text>
      </Pressable>

      <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: "800" }}>Last action</Text>
        <Text style={{ color: "#333" }}>{state.lastAction}</Text>

        {state.result ? (
          state.result.ok ? (
            <>
              <Text style={{ color: "#0a7", fontWeight: "800" }}>OK ({state.result.status})</Text>
              <Text style={{ color: "#444" }}>x-request-id: {state.result.requestId}</Text>
              <Text style={{ fontFamily: "Courier" }}>{pretty(state.result.json)}</Text>
            </>
          ) : (
            <>
              <Text style={{ color: "#b00", fontWeight: "800" }}>
                FAIL ({state.result.status || 0}) • kind={state.result.kind}
              </Text>
              <Text style={{ color: "#444" }}>x-request-id: {state.result.requestId}</Text>
              <Text style={{ color: "#444" }}>{state.result.error}</Text>
              {state.result.json ? <Text style={{ fontFamily: "Courier" }}>{pretty(state.result.json)}</Text> : null}
            </>
          )
        ) : (
          <Text style={{ color: "#666" }}>No result yet</Text>
        )}
      </View>
    </ScrollView>
  );
}
