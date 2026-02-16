import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
export default function DeleteAccountInfoScreen() {
    const router = useRouter();
    return (_jsx(ModuleScreenShell, { title: "Delete account", subtitle: "This is irreversible", children: _jsxs(View, { style: { gap: 12 }, children: [_jsxs(View, { style: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, gap: 8 }, children: [_jsx(Text, { style: { fontSize: 14, fontWeight: "800" }, children: "What will be deleted" }), _jsx(Text, { children: "- Your Firebase account (sign-in identity)" }), _jsx(Text, { children: "- Your Firestore user data and history" }), _jsx(Text, { style: { marginTop: 6 }, children: "After you continue, you\u2019ll confirm by typing DELETE." })] }), _jsxs(View, { style: { borderWidth: 1, borderColor: "#e6a0a0", borderRadius: 12, padding: 12, gap: 8 }, children: [_jsx(Text, { style: { fontSize: 14, fontWeight: "800" }, children: "Important" }), _jsx(Text, { children: "You will be signed out immediately after we receive your request." }), _jsx(Text, { children: "If you change your mind, do not proceed." })] }), _jsx(Pressable, { accessibilityRole: "button", onPress: () => router.push("/(app)/settings/delete-account/confirm"), style: { backgroundColor: "#111", padding: 14, borderRadius: 12, alignItems: "center" }, children: _jsx(Text, { style: { color: "#fff", fontWeight: "800" }, children: "Continue" }) })] }) }));
}
