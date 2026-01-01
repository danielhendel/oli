// app/debug/health.tsx
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { apiGetJsonAuthed, type ApiResult, type JsonValue, type FailureKind } from "@/lib/api/http";
import { getIdToken } from "@/lib/auth/getIdToken";

const KIND_HTTP: FailureKind = "http";
const KIND_PARSE: FailureKind = "parse";

export default function DebugHealth() {
  const [result, setResult] = useState<ApiResult<JsonValue> | null>(null);

  const run = async () => {
    const token = await getIdToken();
    const r = await apiGetJsonAuthed<JsonValue>("/health", token, { noStore: true });
    setResult(r);
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Health</Text>

      <Pressable onPress={run} style={{ padding: 12, borderWidth: 1, borderRadius: 8 }}>
        <Text>GET /health</Text>
      </Pressable>

      <Text style={{ opacity: 0.6 }}>
        Kinds: {KIND_HTTP}, {KIND_PARSE}
      </Text>

      <Text selectable style={{ fontFamily: "Menlo" }}>
        {result ? JSON.stringify(result, null, 2) : "No result yet"}
      </Text>
    </View>
  );
}
