import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/debug/token.tsx
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
// IMPORTANT: use the same module resolution as the rest of the app to avoid duplicate context instances
import { useAuth } from "@/lib/auth/AuthProvider";
export default function DebugTokenScreen() {
    const authState = useAuth();
    const [token, setToken] = useState("");
    const user = authState.user;
    const getIdToken = authState.getIdToken;
    const signOutUser = authState.signOutUser;
    const diagnostics = useMemo(() => {
        const tokenLen = token ? token.length : 0;
        const dotCount = token ? (token.match(/\./g)?.length ?? 0) : 0;
        const tokenPreview = token ? `${token.slice(0, 16)}…${token.slice(-16)}` : "—";
        return { tokenLen, dotCount, tokenPreview };
    }, [token]);
    const onCopy = async () => {
        if (!token) {
            Alert.alert("No token", "Generate a token first.");
            return;
        }
        await Clipboard.setStringAsync(token);
        Alert.alert("Copied", "ID token copied to clipboard.");
    };
    const onGenerate = async (forceRefresh) => {
        try {
            const t = await getIdToken(forceRefresh);
            if (!t) {
                Alert.alert("Not signed in", "Sign in first to generate a token.");
                return;
            }
            setToken(t);
        }
        catch (e) {
            Alert.alert("Failed to generate token", String(e));
        }
    };
    return (_jsxs(ScrollView, { contentContainerStyle: { padding: 16, gap: 12 }, children: [_jsx(Text, { style: { fontSize: 22, fontWeight: "700" }, children: "Firebase ID Token" }), _jsxs(View, { style: { padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 12 }, children: [_jsx(Text, { style: { color: "#555" }, children: "UID" }), _jsx(Text, { style: { fontWeight: "700" }, children: user?.uid ?? "—" })] }), _jsx(Pressable, { accessibilityRole: "button", onPress: () => onGenerate(false), style: { backgroundColor: "#111", padding: 14, borderRadius: 12 }, children: _jsx(Text, { style: { color: "#fff", textAlign: "center", fontWeight: "700" }, children: "Generate token" }) }), _jsx(Pressable, { accessibilityRole: "button", onPress: () => onGenerate(true), style: { backgroundColor: "#111", padding: 14, borderRadius: 12 }, children: _jsx(Text, { style: { color: "#fff", textAlign: "center", fontWeight: "700" }, children: "Refresh + generate" }) }), _jsx(Pressable, { accessibilityRole: "button", onPress: onCopy, style: { backgroundColor: "#444", padding: 14, borderRadius: 12 }, children: _jsx(Text, { style: { color: "#fff", textAlign: "center", fontWeight: "700" }, children: "Copy token" }) }), _jsxs(View, { style: { padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 12 }, children: [_jsx(Text, { style: { color: "#555" }, children: "Token diagnostics" }), _jsxs(Text, { style: { fontWeight: "700" }, children: ["len: ", diagnostics.tokenLen] }), _jsxs(Text, { style: { fontWeight: "700" }, children: ["dots: ", diagnostics.dotCount] }), _jsxs(Text, { style: { fontWeight: "700" }, children: ["preview: ", diagnostics.tokenPreview] })] }), _jsxs(View, { style: { padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 12 }, children: [_jsx(Text, { style: { color: "#555", marginBottom: 8 }, children: "Token" }), _jsx(Text, { selectable: true, style: { fontSize: 12, lineHeight: 18 }, children: token || "—" })] }), _jsx(Pressable, { accessibilityRole: "button", onPress: () => signOutUser(), style: { backgroundColor: "#b00020", padding: 14, borderRadius: 12 }, children: _jsx(Text, { style: { color: "#fff", textAlign: "center", fontWeight: "700" }, children: "Sign out" }) })] }));
}
