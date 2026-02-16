import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/settings/delete-account/confirm.tsx
import { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { requestAccountDelete } from "@/lib/api/account";
import { newRequestId } from "@/lib/util/requestId";
export default function DeleteAccountConfirmScreen() {
    const router = useRouter();
    const { user, getIdToken } = useAuth();
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const canSubmit = useMemo(() => !submitting && text.trim().toUpperCase() === "DELETE", [submitting, text]);
    return (_jsx(ModuleScreenShell, { title: "Confirm deletion", subtitle: "Type DELETE to continue", children: _jsxs(View, { style: { gap: 12 }, children: [_jsxs(View, { style: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, gap: 8 }, children: [_jsx(Text, { style: { fontSize: 14, fontWeight: "800" }, children: "This cannot be undone" }), _jsxs(Text, { children: ["To delete your account and all associated data, type ", _jsx(Text, { style: { fontWeight: "800" }, children: "DELETE" }), " below."] })] }), _jsx(TextInput, { value: text, onChangeText: setText, autoCapitalize: "characters", autoCorrect: false, placeholder: "Type DELETE", accessibilityLabel: "Type DELETE to confirm", style: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, fontSize: 16 } }), _jsx(Pressable, { accessibilityRole: "button", disabled: !canSubmit, onPress: () => {
                        Alert.alert("Delete account?", "This is permanent. Your data will be deleted.", [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Delete",
                                style: "destructive",
                                onPress: () => void (async () => {
                                    if (!user) {
                                        router.replace("/(auth)/sign-in");
                                        return;
                                    }
                                    setSubmitting(true);
                                    const rid = newRequestId("del");
                                    try {
                                        const token = await getIdToken(false);
                                        if (!token) {
                                            Alert.alert("Session expired", "Please sign in again.");
                                            router.replace("/(auth)/sign-in");
                                            return;
                                        }
                                        // First attempt
                                        let res = await requestAccountDelete(token, rid);
                                        // Soft re-auth fallback: force refresh and retry once on auth errors.
                                        if (!res.ok && (res.status === 401 || res.status === 403)) {
                                            const refreshed = await getIdToken(true);
                                            if (refreshed)
                                                res = await requestAccountDelete(refreshed, rid);
                                        }
                                        if (!res.ok) {
                                            if (res.status === 401 || res.status === 403) {
                                                Alert.alert("Please sign in again", "For security, please re-authenticate and try again.");
                                                router.replace("/(auth)/sign-in");
                                                return;
                                            }
                                            Alert.alert("Delete failed", res.error || "Something went wrong. Please try again.");
                                            return;
                                        }
                                        router.replace({
                                            pathname: "/(app)/settings/delete-account/receipt",
                                            params: { requestId: rid },
                                        });
                                    }
                                    finally {
                                        setSubmitting(false);
                                    }
                                })(),
                            },
                        ]);
                    }, style: {
                        backgroundColor: canSubmit ? "#111" : "#999",
                        padding: 14,
                        borderRadius: 12,
                        alignItems: "center",
                    }, children: _jsx(Text, { style: { color: "#fff", fontWeight: "800" }, children: submitting ? "Submitting…" : "Delete account" }) })] }) }));
}
