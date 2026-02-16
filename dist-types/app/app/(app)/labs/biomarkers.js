import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useLabResults } from "@/lib/data/useLabResults";
function formatDate(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }
    catch {
        return iso;
    }
}
export default function BiomarkersScreen() {
    const router = useRouter();
    const labResults = useLabResults();
    const { status, refetch } = labResults;
    return (_jsxs(ModuleScreenShell, { title: "Biomarkers", subtitle: "Individual markers", children: [_jsx(Pressable, { onPress: () => router.push("/(app)/labs/log"), accessibilityRole: "button", accessibilityLabel: "Log biomarkers", style: ({ pressed }) => [styles.ctaButton, pressed && styles.ctaPressed], children: _jsx(Text, { style: styles.ctaText, children: "Log biomarkers" }) }), status === "partial" && (_jsxs(View, { style: styles.center, children: [_jsx(ActivityIndicator, { size: "large" }), _jsx(Text, { style: styles.loadingText, children: "Loading\u2026" })] })), status === "error" && (_jsxs(View, { style: styles.errorCard, children: [_jsx(Text, { style: styles.errorText, children: "Failed to load lab results" }), _jsx(Pressable, { onPress: () => refetch(), style: styles.retryButton, children: _jsx(Text, { style: styles.retryText, children: "Retry" }) })] })), status === "ready" && labResults.data && (_jsx(View, { style: styles.list, children: labResults.data.items.length === 0 ? (_jsx(Text, { style: styles.emptyText, children: "No lab results yet. Tap \"Log biomarkers\" to add your first." })) : (labResults.data.items.map((item) => (_jsxs(Pressable, { onPress: () => router.push(`/(app)/labs/lab-result/${item.id}`), accessibilityRole: "button", accessibilityLabel: `View lab result from ${formatDate(item.collectedAt)}`, style: ({ pressed }) => [styles.row, pressed && styles.rowPressed], children: [_jsxs(View, { style: styles.rowLeft, children: [_jsx(Text, { style: styles.rowTitle, children: formatDate(item.collectedAt) }), _jsxs(Text, { style: styles.rowSubtitle, children: [item.biomarkers.length, " biomarker", item.biomarkers.length !== 1 ? "s" : ""] })] }), _jsx(Text, { style: styles.chevron, children: "\u203A" })] }, item.id)))) }))] }));
}
const styles = StyleSheet.create({
    ctaButton: {
        backgroundColor: "#111827",
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
    },
    ctaPressed: { opacity: 0.9 },
    ctaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
    center: { alignItems: "center", paddingVertical: 24, gap: 12 },
    loadingText: { fontSize: 14, opacity: 0.7 },
    errorCard: {
        backgroundColor: "#FEF2F2",
        borderRadius: 14,
        padding: 16,
        gap: 12,
    },
    errorText: { color: "#B00020", fontSize: 14, fontWeight: "600" },
    retryButton: {
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#B00020",
        borderRadius: 8,
    },
    retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
    list: { gap: 10, marginTop: 16 },
    emptyText: { fontSize: 14, opacity: 0.7, paddingVertical: 20 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: "#F2F2F7",
    },
    rowPressed: { opacity: 0.85 },
    rowLeft: { flex: 1, gap: 4 },
    rowTitle: { fontSize: 16, fontWeight: "700" },
    rowSubtitle: { fontSize: 13, opacity: 0.7 },
    chevron: { fontSize: 22, opacity: 0.5, paddingLeft: 6 },
});
