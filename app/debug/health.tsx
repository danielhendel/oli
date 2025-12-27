// app/debug/health.tsx
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { getEnv } from "@/lib/env";
import { useAuth } from "@/lib/auth/AuthProvider";
import { apiGetJson, type ApiResult } from "@/lib/api/http";

type RowProps = {
  title: string;
  result: ApiResult | null;
};

const pretty = (v: unknown): string => {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};

function ResultRow({ title, result }: RowProps) {
  return (
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: "800" }}>{title}</Text>
      {!result ? (
        <Text style={{ color: "#666" }}>Not run</Text>
      ) : result.ok ? (
        <>
          <Text style={{ color: "#0a7" }}>OK ({result.status})</Text>
          <Text style={{ color: "#444" }}>x-request-id: {result.requestId}</Text>
          <Text style={{ fontFamily: "Courier" }}>{pretty(result.json)}</Text>
        </>
      ) : (
        <>
          <Text style={{ color: "#b00" }}>
            FAIL ({result.status || 0}) • kind={result.kind}
          </Text>
          <Text style={{ color: "#444" }}>x-request-id: {result.requestId}</Text>
          <Text style={{ color: "#444" }}>{result.error}</Text>
          {result.json ? <Text style={{ fontFamily: "Courier" }}>{pretty(result.json)}</Text> : null}
        </>
      )}
    </View>
  );
}

export default function DebugHealthScreen() {
  const env = useMemo(() => getEnv(), []);
  const { user, getIdToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<ApiResult | null>(null);
  const [healthAuth, setHealthAuth] = useState<ApiResult | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const r1 = await apiGetJson("/health");
      setHealth(r1);

      const token = await getIdToken(false);
      if (!token) {
        setHealthAuth({
          ok: false,
          kind: "http",
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

      const requestId = res.headers.get("x-request-id")?.trim() || "missing";
      const text = await res.text();

      let json: unknown = {};
      try {
        json = text ? (JSON.parse(text) as unknown) : {};
      } catch {
        setHealthAuth({
          ok: false,
          kind: "parse",
          status: res.status,
          error: "Invalid JSON from /health/auth",
          requestId,
        });
        return;
      }

      if (!res.ok) {
        setHealthAuth({
          ok: false,
          kind: "http",
          status: res.status,
          error: "Unauthorized",
          requestId,
          json: json as unknown as never, // ApiResult expects JsonValue; we avoid any and keep debug-only payload
        });
        return;
      }

      setHealthAuth({
        ok: true,
        status: res.status,
        json: json as unknown as never, // debug-only; still no any
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
        onPress={run}
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
