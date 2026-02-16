import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/debug/index.tsx
import { useState } from "react";
import { Text, Pressable, ScrollView } from "react-native";
import { apiGetJsonAuthed, apiPostJsonAuthed } from "@/lib/api/http";
import { getIdToken } from "@/lib/auth/getIdToken";
const getDeviceTimeZone = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return typeof tz === "string" && tz.length ? tz : "UTC";
    }
    catch {
        return "UTC";
    }
};
export default function DebugIndex() {
    const [result, setResult] = useState(null);
    const ping = async () => {
        const token = await getIdToken();
        const r = await apiGetJsonAuthed("/health", token, { noStore: true });
        setResult(r);
    };
    const dayTruth = async () => {
        const token = await getIdToken();
        const r = await apiGetJsonAuthed("/users/me/day-truth", token, { noStore: true });
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
        const r = await apiPostJsonAuthed("/ingest", body, token, {
            idempotencyKey: `debug-weight-${Date.now()}`,
        });
        setResult(r);
    };
    return (_jsxs(ScrollView, { contentContainerStyle: { padding: 16, gap: 12 }, children: [_jsx(Text, { style: { fontSize: 18, fontWeight: "600" }, children: "Debug" }), _jsx(Pressable, { onPress: ping, style: { padding: 12, borderWidth: 1, borderRadius: 10 }, children: _jsx(Text, { children: "GET /health" }) }), _jsx(Pressable, { onPress: dayTruth, style: { padding: 12, borderWidth: 1, borderRadius: 10 }, children: _jsx(Text, { children: "GET /users/me/day-truth" }) }), _jsx(Pressable, { onPress: logWeight, style: { padding: 12, borderWidth: 1, borderRadius: 10 }, children: _jsx(Text, { children: "POST /ingest (weight)" }) }), _jsx(Text, { selectable: true, style: { fontFamily: "Menlo", fontSize: 12, paddingTop: 8 }, children: result ? JSON.stringify(result, null, 2) : "No result yet" })] }));
}
