// app/debug/index.tsx
import React, { useState } from "react";
import { Text, Pressable, ScrollView } from "react-native";
import { apiGetJsonAuthed, apiPostJsonAuthed, type ApiResult, type JsonValue } from "@/lib/api/http";
import { getIdToken } from "@/lib/auth/getIdToken";

const getDeviceTimeZone = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
};

export default function DebugIndex() {
  const [result, setResult] = useState<ApiResult<JsonValue> | null>(null);

  const ping = async () => {
    const token = await getIdToken();
    const r = await apiGetJsonAuthed<JsonValue>("/health", token, { noStore: true });
    setResult(r);
  };

  const dayTruth = async () => {
    const token = await getIdToken();
    const r = await apiGetJsonAuthed<JsonValue>("/users/me/day-truth", token, { noStore: true });
    setResult(r);
  };

  const logWeight = async () => {
    const token = await getIdToken();
    const now = new Date().toISOString();
    const timezone = getDeviceTimeZone();

    const body = {
      provider: "manual",
      kind: "weight",
      observedAt: now,
      sourceId: "manual",
      payload: {
        time: now,
        timezone,
        weightKg: 80,
      },
    };

    const r = await apiPostJsonAuthed<JsonValue>("/ingest", body, token, {
      idempotencyKey: `debug-weight-${Date.now()}`,
    });

    setResult(r);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Debug</Text>

      <Pressable onPress={ping} style={{ padding: 12, borderWidth: 1, borderRadius: 10 }}>
        <Text>GET /health</Text>
      </Pressable>

      <Pressable onPress={dayTruth} style={{ padding: 12, borderWidth: 1, borderRadius: 10 }}>
        <Text>GET /users/me/day-truth</Text>
      </Pressable>

      <Pressable onPress={logWeight} style={{ padding: 12, borderWidth: 1, borderRadius: 10 }}>
        <Text>POST /ingest (weight)</Text>
      </Pressable>

      <Text selectable style={{ fontFamily: "Menlo", fontSize: 12, paddingTop: 8 }}>
        {result ? JSON.stringify(result, null, 2) : "No result yet"}
      </Text>
    </ScrollView>
  );
}
