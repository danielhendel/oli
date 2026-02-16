import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useAuth } from "@/lib/auth/AuthProvider";
export default function SettingsAccountScreen() {
    const router = useRouter();
    const { user, signOut } = useAuth();
    return (_jsx(ModuleScreenShell, { title: "Account", subtitle: "Sign-in status", children: _jsxs(View, { style: { gap: 12 }, children: [_jsxs(View, { style: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, gap: 6 }, children: [_jsx(Text, { style: { fontSize: 14, fontWeight: "800" }, children: "Status" }), _jsxs(Text, { children: ["Signed in: ", user ? "yes" : "no"] }), user ? _jsxs(Text, { children: ["UID: ", user.uid] }) : null] }), !user ? (_jsx(Pressable, { accessibilityRole: "button", onPress: () => router.push("/(auth)/sign-in"), style: {
                        backgroundColor: "#111",
                        padding: 14,
                        borderRadius: 12,
                        alignItems: "center",
                    }, children: _jsx(Text, { style: { color: "#fff", fontWeight: "800" }, children: "Sign in" }) })) : (_jsx(Pressable, { accessibilityRole: "button", onPress: () => {
                        Alert.alert("Sign out?", "You’ll need to sign in again to access your data.", [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Sign out",
                                style: "destructive",
                                onPress: () => void signOut(),
                            },
                        ]);
                    }, style: {
                        backgroundColor: "#111",
                        padding: 14,
                        borderRadius: 12,
                        alignItems: "center",
                    }, children: _jsx(Text, { style: { color: "#fff", fontWeight: "800" }, children: "Sign out" }) }))] }) }));
}
