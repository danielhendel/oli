import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/debug/re-auth.tsx
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "@/lib/auth/AuthProvider";
export default function DebugReAuthScreen() {
    const { user, getIdToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState("");
    const run = async () => {
        setLoading(true);
        try {
            if (!user) {
                setResult("Not signed in.");
                return;
            }
            const t = await getIdToken(true); // ✅ force refresh
            setResult(t ? `Token refreshed.\n\nuid=${user.uid}\nlen=${t.length}` : "Failed to refresh token.");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(ScrollView, { contentContainerStyle: { padding: 16, gap: 12 }, children: [_jsx(Text, { style: { fontSize: 20, fontWeight: "900" }, children: "Re-auth" }), _jsxs(View, { style: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, gap: 6 }, children: [_jsx(Text, { style: { fontSize: 14, fontWeight: "800" }, children: "Status" }), _jsxs(Text, { children: ["Signed in: ", user ? `yes (${user.uid.slice(0, 8)}…)` : "no"] })] }), _jsx(Pressable, { accessibilityRole: "button", onPress: run, disabled: loading, style: {
                    backgroundColor: "#111",
                    padding: 14,
                    borderRadius: 12,
                    opacity: loading ? 0.6 : 1,
                    alignItems: "center",
                }, children: loading ? _jsx(ActivityIndicator, { color: "#fff" }) : _jsx(Text, { style: { color: "#fff", fontWeight: "800" }, children: "Force Refresh Token" }) }), result ? (_jsx(View, { style: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }, children: _jsx(Text, { style: { fontFamily: "Courier" }, children: result }) })) : null] }));
}
