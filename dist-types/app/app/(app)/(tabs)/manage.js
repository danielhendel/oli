import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/(tabs)/manage.tsx
import { ScrollView, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
export default function ManageScreen() {
    const router = useRouter();
    return (_jsx(ScreenContainer, { children: _jsxs(ScrollView, { contentContainerStyle: styles.scroll, children: [_jsx(Text, { style: styles.title, children: "Manage" }), _jsx(Text, { style: styles.subtitle, children: "Entry point for logging and management. Destructive actions require auth friction (Sprint 4+)." }), _jsx(Text, { style: styles.link, onPress: () => router.push("/(app)/command-center"), children: "Open Command Center" }), _jsx(Text, { style: styles.link, onPress: () => router.push("/(app)/log"), children: "Quick log (Phase 2)" })] }) }));
}
const styles = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
    subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4, lineHeight: 22 },
    link: { marginTop: 24, fontSize: 15, color: "#007AFF", fontWeight: "600" },
});
