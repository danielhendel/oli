import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/debug/health.tsx
import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { apiGetJsonAuthed } from "@/lib/api/http";
import { getIdToken } from "@/lib/auth/getIdToken";
const KIND_HTTP = "http";
const KIND_PARSE = "parse";
export default function DebugHealth() {
    const [result, setResult] = useState(null);
    const run = async () => {
        const token = await getIdToken();
        const r = await apiGetJsonAuthed("/health", token, { noStore: true });
        setResult(r);
    };
    return (_jsxs(View, { style: { padding: 16, gap: 12 }, children: [_jsx(Text, { style: { fontSize: 18, fontWeight: "600" }, children: "Health" }), _jsx(Pressable, { onPress: run, style: { padding: 12, borderWidth: 1, borderRadius: 8 }, children: _jsx(Text, { children: "GET /health" }) }), _jsxs(Text, { style: { opacity: 0.6 }, children: ["Kinds: ", KIND_HTTP, ", ", KIND_PARSE] }), _jsx(Text, { selectable: true, style: { fontFamily: "Menlo" }, children: result ? JSON.stringify(result, null, 2) : "No result yet" })] }));
}
