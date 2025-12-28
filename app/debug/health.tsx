// app/debug/health.tsx
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { getEnv } from "@/lib/env";
import { useAuth } from "@/lib/auth/AuthProvider";
import { apiGetJson, type ApiResult, type JsonValue, type FailureKind } from "@/lib/api/http";

type RowProps = {
  title: string;
  result: ApiResult<JsonValue> | null;
};

const pretty = (v: unknown): string => {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};

const coerceJsonValue = (v: unknown): JsonValue | null => {
  try {
    return JSON.parse(JSON.stringify(v)) as JsonValue;
  } catch {
    return null;
  }
};

// Your FailureKind union clearly includes HTTP and PARSE (uppercase).
// It does NOT include AUTH in your repo right now, so treat auth failures as HTTP with a better message.
const KIND_HTTP: FailureKind = "HTTP";
const KIND_PARSE: FailureKind = "PARSE";

function ResultRow({ title, result }: RowProps) {
  return (
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: "800" }}>{title}</Text>
      {!result ? (
        <Text style={{ color: "#666" }}>Not run</Text>
      ) : result.ok ? (
        <>
          <Text style={{ color: "#0a7" }}>OK ({result.status})</Text>
          <Text style={{ color: "#444" }}>x-request-id: {result.requestId ?? "missing"}</Text>
          <Text style={{ fontFamily: "Courier" }}>{pretty(result.json)}</Text>
        </>
      ) : (
        <>
          <Text style={{ color: "#b00" }}>
            FAIL ({result.status}) • kind={result.kind}
          </Text>
          <Text style={{ color: "#444" }}>x-request-id: {result.requestId ?? "missing"}</Text>
          <Text style={{ color: "#444" }}>{result.error}</Text>
          {"json" in result && result.json ? <Text style={{ fontFamily: "Courier" }}>{pretty(result.json)}</Text> : null}
        </>
      )}
    </View>
  );
}

export default function DebugHealthScreen() {
  const env = useMemo(() => getEnv(), []);
  const { user, getIdToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<ApiResult<JsonValue> | null>(null);
  const [healthAuth, setHealthAuth] = useState<ApiResult<JsonValue> | null>(null);

  const run = async (): Promise<void> => {
    setLoading(true);
    try {
      const r1 = await apiGetJson("/health");
      setHealth(r1);

      const token = await getIdToken();
      if (!token) {
        setHealthAuth({
          ok: false,
          kind: KIND_HTTP,
          status: 401,
          error: "No token. Sign in first to test /health/auth.",
          requestId: "client-no-token",
        });
        return;
      }

      const res = await fetch(`${env.EXPO_PUBLIC_BACKEND_BASE_URL}/health/auth`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      const requestId = (res.headers.get("x-request-id") ?? "").trim() || null;
      const text = await res.text();

      let parsedUnknown: unknown = null;
      if (text.length) {
        try {
          parsedUnknown = JSON.parse(text) as unknown;
        } catch {
          setHealthAuth({
            ok: false,
            kind: KIND_PARSE,
            status: res.status,
            error: "Invalid JSON from /health/auth",
            json: coerceJsonValue({ raw: text }),
            requestId,
          });
          return;
        }
      }

      const json = coerceJsonValue(parsedUnknown);

      if (!res.ok) {
        setHealthAuth({
          ok: false,
          kind: KIND_HTTP,
          status: res.status,
          error: res.status === 401 ? "Unauthorized" : `HTTP ${res.status}`,
          ...(json !== null ? { json } : {}),
          requestId,
        });
        return;
      }

      // ApiOk<T> requires `json: T`. JsonValue includes null, so always provide it.
      setHealthAuth({
        ok: true,
        status: res.status,
        json: json ?? null,
        requestId,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "900" }}>Backend Health</Text>

      <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, gap: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: "800" }}>Wiring</Text>
        <Text>Base URL: {env.EXPO_PUBLIC_BACKEND_BASE_URL}</Text>
        <Text>Firebase Project ID: {env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}</Text>
        <Text>Signed in: {user ? `yes (${user.uid.slice(0, 8)}…)` : "no"}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => void run()}
        disabled={loading}
        style={{
          backgroundColor: "#111",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.6 : 1,
          alignItems: "center",
        }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800" }}>Run Check</Text>}
      </Pressable>

      <ResultRow title="GET /health" result={health} />
      <ResultRow title="GET /health/auth" result={healthAuth} />
    </ScrollView>
  );
}
