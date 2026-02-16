import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/(tabs)/stats.tsx
import { View, Text, StyleSheet } from "react-native";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
export default function StatsScreen() {
    return (_jsx(ScreenContainer, { children: _jsxs(View, { style: styles.container, children: [_jsx(Text, { style: styles.title, children: "Stats" }), _jsx(Text, { style: styles.placeholder, children: "Interpretive surface \u2014 placeholder for Sprint 3." })] }) }));
}
const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, justifyContent: "center" },
    title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
    placeholder: {
        marginTop: 8,
        fontSize: 15,
        color: "#8E8E93",
        lineHeight: 22,
    },
});
