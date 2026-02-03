import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// components/failures/FailureCard.tsx
import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
function formatLocalDateTime(iso) {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms))
        return iso;
    const d = new Date(ms);
    return d.toLocaleString();
}
function coerceString(v) {
    return typeof v === "string" && v.trim().length ? v.trim() : null;
}
function extractDomain(details) {
    if (!details || typeof details !== "object")
        return null;
    // Sprint 1: show affected domain only if explicitly present.
    const d = details;
    return (coerceString(d.affectedDomain) ??
        coerceString(d.domain) ??
        coerceString(d.stack) ??
        coerceString(d.module) ??
        coerceString(d.area));
}
export function FailureCard({ item }) {
    const domain = useMemo(() => extractDomain(item.details), [item.details]);
    const sourceParts = [item.type];
    if (item.rawEventPath)
        sourceParts.push(item.rawEventPath);
    return (_jsxs(View, { style: styles.card, accessibilityRole: "summary", children: [_jsx(Text, { style: styles.title, children: "Failed" }), _jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Timestamp" }), _jsx(Text, { style: styles.value, children: formatLocalDateTime(item.createdAt) })] }), _jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Source" }), _jsx(Text, { style: styles.value, numberOfLines: 2, children: sourceParts.join(" • ") })] }), _jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Reason" }), _jsxs(Text, { style: styles.value, numberOfLines: 3, children: [item.code, ": ", item.message] })] }), domain ? (_jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Affected domain" }), _jsx(Text, { style: styles.value, children: domain })] })) : null] }));
}
const styles = StyleSheet.create({
    card: {
        backgroundColor: "#FDECEC",
        borderRadius: 16,
        padding: 14,
        gap: 10,
    },
    title: {
        fontSize: 14,
        fontWeight: "900",
        color: "#B00020",
        letterSpacing: 0.2,
    },
    row: {
        gap: 2,
    },
    label: {
        fontSize: 12,
        fontWeight: "700",
        opacity: 0.8,
    },
    value: {
        fontSize: 13,
        color: "#1C1C1E",
    },
});
