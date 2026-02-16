import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(auth)/sign-in.tsx
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmail } from "@/lib/auth/actions";
export default function SignInScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0 && !submitting, [
        email,
        password,
        submitting,
    ]);
    const onSubmit = async () => {
        if (!canSubmit)
            return;
        setSubmitting(true);
        try {
            const result = await signInWithEmail(email, password);
            if (!result.ok) {
                Alert.alert(result.title, result.message);
                return;
            }
            router.replace("/(app)/command-center");
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs(View, { style: styles.container, children: [_jsx(Text, { style: styles.title, children: "Sign in" }), _jsx(Text, { style: styles.label, children: "Email" }), _jsx(TextInput, { autoCapitalize: "none", autoCorrect: false, keyboardType: "email-address", placeholder: "you@example.com", value: email, onChangeText: setEmail, style: styles.input, editable: !submitting }), _jsx(Text, { style: styles.label, children: "Password" }), _jsx(TextInput, { secureTextEntry: true, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: password, onChangeText: setPassword, style: styles.input, editable: !submitting }), _jsx(Pressable, { onPress: onSubmit, disabled: !canSubmit, style: [styles.button, !canSubmit ? styles.buttonDisabled : null], children: _jsx(Text, { style: styles.buttonText, children: submitting ? "Signing in…" : "Sign in" }) }), _jsx(Pressable, { onPress: () => router.push("/(auth)/sign-up"), disabled: submitting, style: styles.link, children: _jsx(Text, { style: styles.linkText, children: "Create an account" }) })] }));
}
const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: "center" },
    title: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
    label: { marginTop: 12, marginBottom: 6, fontSize: 14, opacity: 0.8 },
    input: {
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.15)",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
    },
    button: {
        marginTop: 18,
        backgroundColor: "black",
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
    },
    buttonDisabled: { opacity: 0.4 },
    buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
    link: { marginTop: 14, alignItems: "center" },
    linkText: { fontSize: 14, textDecorationLine: "underline" },
});
