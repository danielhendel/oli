import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/debug/api-smoke.tsx
import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { apiGetJsonAuthed, apiPostJsonAuthed } from "../../lib/api/http";
import { getIdToken } from "../../lib/auth/getIdToken";
const getDeviceTimeZone = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return typeof tz === "string" && tz.length ? tz : "UTC";
    }
    catch {
        return "UTC";
    }
};
export default function ApiSmoke() {
    const [result, setResult] = useState(null);
    const runGet = async () => {
        const token = await getIdToken();
        const r = await apiGetJsonAuthed("/users/me/day-truth", token, { noStore: true });
        setResult(r);
    };
    const runPost = async () => {
        const token = await getIdToken();
        const now = new Date().toISOString();
        const timezone = getDeviceTimeZone();
        // ✅ canonical ingest envelope
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
    return (_jsxs(View, { style: { padding: 16, gap: 12 }, children: [_jsx(Text, { style: { fontSize: 18, fontWeight: "600" }, children: "API Smoke" }), _jsx(Pressable, { onPress: runGet, style: { padding: 12, borderWidth: 1, borderRadius: 8 }, children: _jsx(Text, { children: "GET /users/me/day-truth" }) }), _jsx(Pressable, { onPress: runPost, style: { padding: 12, borderWidth: 1, borderRadius: 8 }, children: _jsx(Text, { children: "POST /ingest (weight)" }) }), _jsx(View, { style: { paddingTop: 12 }, children: _jsx(Text, { selectable: true, style: { fontFamily: "Menlo" }, children: result ? JSON.stringify(result, null, 2) : "No result yet" }) })] }));
}
