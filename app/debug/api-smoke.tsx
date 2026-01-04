// app/debug/api-smoke.tsx
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { apiGetJsonAuthed, apiPostJsonAuthed, type ApiResult, type JsonValue } from "../../lib/api/http";
import { getIdToken } from "../../lib/auth/getIdToken";

export default function ApiSmoke() {
  const [result, setResult] = useState<ApiResult<JsonValue> | null>(null);

  const runGet = async () => {
    const token = await getIdToken();
    const r = await apiGetJsonAuthed<JsonValue>("/users/me/day-truth", token, { noStore: true });
    setResult(r);
  };

  const runPost = async () => {
    const token = await getIdToken();
    const r = await apiPostJsonAuthed<JsonValue>("/users/me/body/weight", { weightKg: 80 }, token, {
      idempotencyKey: `debug-weight-${Date.now()}`,
    });
    setResult(r);
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>API Smoke</Text>

      <Pressable onPress={runGet} style={{ padding: 12, borderWidth: 1, borderRadius: 8 }}>
        <Text>GET /users/me/day-truth</Text>
      </Pressable>

      <Pressable onPress={runPost} style={{ padding: 12, borderWidth: 1, borderRadius: 8 }}>
        <Text>POST /users/me/body/weight</Text>
      </Pressable>

      <View style={{ paddingTop: 12 }}>
        <Text selectable style={{ fontFamily: "Menlo" }}>
          {result ? JSON.stringify(result, null, 2) : "No result yet"}
        </Text>
      </View>
    </View>
  );
}
