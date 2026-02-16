import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { View, Text, StyleSheet } from "react-native";
import { FailureCard } from "@/components/failures/FailureCard";
export function FailureList({ items, truncated = false, onItemPress }) {
    if (!items.length) {
        return (_jsxs(View, { style: styles.empty, children: [_jsx(Text, { style: styles.emptyTitle, children: "No failures recorded" }), _jsx(Text, { style: styles.emptyText, children: "This means no failed, rejected, or missing data has been written to failure memory." })] }));
    }
    return (_jsxs(View, { style: styles.list, children: [truncated ? (_jsxs(View, { style: styles.truncated, children: [_jsx(Text, { style: styles.truncatedTitle, children: "More failures exist" }), _jsx(Text, { style: styles.truncatedText, children: "Not all failures are loaded on this device. Failure memory remains intact." })] })) : null, items.map((item) => (_jsx(FailureCard, { item: item, ...(onItemPress ? { onPress: () => onItemPress(item) } : {}) }, item.id)))] }));
}
const styles = StyleSheet.create({
    list: {
        gap: 12,
    },
    empty: {
        backgroundColor: "#F2F2F7",
        borderRadius: 16,
        padding: 14,
        gap: 6,
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: "800",
    },
    emptyText: {
        fontSize: 13,
        opacity: 0.75,
    },
    truncated: {
        backgroundColor: "#FFF5E6",
        borderRadius: 16,
        padding: 14,
        gap: 6,
    },
    truncatedTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: "#7A4E00",
    },
    truncatedText: {
        fontSize: 13,
        color: "#333",
    },
});
