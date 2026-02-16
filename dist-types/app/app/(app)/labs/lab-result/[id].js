import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useLabResult } from "@/lib/data/useLabResult";
function formatDate(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    catch {
        return iso;
    }
}
export default function LabResultDetailScreen() {
    const { id } = useLocalSearchParams();
    const labResult = useLabResult(id ?? "");
    const { status, refetch } = labResult;
    if (status === "partial") {
        return (_jsx(ModuleScreenShell, { title: "Lab result", subtitle: "Loading\u2026", children: _jsx(View, { style: styles.center, children: _jsx(ActivityIndicator, { size: "large" }) }) }));
    }
    if (status === "missing") {
        return (_jsx(ModuleScreenShell, { title: "Lab result", subtitle: "Not found", children: _jsx(Text, { style: styles.errorText, children: "Lab result not found." }) }));
    }
    if (status === "error" && "error" in labResult) {
        return (_jsxs(ModuleScreenShell, { title: "Lab result", subtitle: "Error", children: [_jsx(Text, { style: styles.errorText, children: labResult.error }), _jsx(Pressable, { onPress: () => refetch(), style: styles.retryButton, children: _jsx(Text, { style: styles.retryText, children: "Retry" }) })] }));
    }
    const lab = labResult.data;
    return (_jsx(ModuleScreenShell, { title: "Lab result", subtitle: formatDate(lab.collectedAt), children: _jsxs(View, { style: styles.card, children: [_jsxs(Text, { style: styles.metaText, children: ["Collected: ", formatDate(lab.collectedAt)] }), lab.sourceRawEventId ? (_jsxs(Text, { style: styles.metaText, children: ["Source: ", lab.sourceRawEventId] })) : null, _jsx(Text, { style: [styles.label, { marginTop: 16 }], children: "Biomarkers" }), _jsx(View, { style: styles.table, children: lab.biomarkers.map((b, i) => (_jsxs(View, { style: styles.biomarkerRow, children: [_jsx(Text, { style: styles.biomarkerName, children: b.name }), _jsxs(Text, { style: styles.biomarkerValue, children: [b.value, " ", b.unit] })] }, i))) })] }) }));
}
const styles = StyleSheet.create({
    center: { alignItems: "center", paddingVertical: 24 },
    errorText: { color: "#B00020", fontSize: 14, fontWeight: "600" },
    retryButton: {
        marginTop: 12,
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#B00020",
        borderRadius: 8,
    },
    retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
    card: {
        backgroundColor: "#F2F2F7",
        borderRadius: 16,
        padding: 16,
    },
    metaText: { fontSize: 13, opacity: 0.8 },
    label: { fontSize: 13, fontWeight: "700", color: "#111827" },
    table: { marginTop: 8, gap: 8 },
    biomarkerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
    },
    biomarkerName: { fontSize: 15, fontWeight: "600" },
    biomarkerValue: { fontSize: 14, opacity: 0.8 },
});
