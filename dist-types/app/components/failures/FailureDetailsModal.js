import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// components/failures/FailureDetailsModal.tsx
import { useMemo } from "react";
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
function formatLocalDateTime(iso) {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms))
        return iso;
    return new Date(ms).toLocaleString();
}
function formatDetails(details) {
    if (!details || typeof details !== "object")
        return "—";
    try {
        return JSON.stringify(details, null, 2);
    }
    catch {
        return String(details);
    }
}
export function FailureDetailsModal({ item, onClose }) {
    const detailsStr = useMemo(() => formatDetails(item.details), [item.details]);
    return (_jsx(Modal, { visible: true, transparent: true, animationType: "fade", children: _jsx(Pressable, { style: styles.backdrop, onPress: onClose, children: _jsx(Pressable, { style: styles.content, onPress: (e) => e.stopPropagation(), children: _jsxs(ScrollView, { contentContainerStyle: styles.scroll, children: [_jsx(Text, { style: styles.title, children: "Failure details" }), _jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "ID" }), _jsx(Text, { style: styles.value, children: item.id })] }), _jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Timestamp" }), _jsx(Text, { style: styles.value, children: formatLocalDateTime(item.createdAt) })] }), _jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Type" }), _jsx(Text, { style: styles.value, children: item.type })] }), _jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Day" }), _jsx(Text, { style: styles.value, children: item.day })] }), _jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Code" }), _jsx(Text, { style: styles.value, children: item.code })] }), _jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Message" }), _jsx(Text, { style: styles.value, children: item.message })] }), item.rawEventId ? (_jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Raw event ID" }), _jsx(Text, { style: styles.value, children: item.rawEventId })] })) : null, item.rawEventPath ? (_jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Raw event path" }), _jsx(Text, { style: styles.value, children: item.rawEventPath })] })) : null, item.details ? (_jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.label, children: "Details" }), _jsx(Text, { style: [styles.value, styles.detailsBlock], children: detailsStr })] })) : null, _jsx(Pressable, { onPress: onClose, style: styles.closeBtn, children: _jsx(Text, { style: styles.closeBtnText, children: "Close" }) })] }) }) }) }));
}
const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    content: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        maxWidth: 400,
        width: "100%",
        maxHeight: "80%",
    },
    scroll: {
        padding: 20,
        gap: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: "900",
        marginBottom: 8,
    },
    row: {
        gap: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: "700",
        opacity: 0.8,
    },
    value: {
        fontSize: 14,
        color: "#1C1C1E",
    },
    detailsBlock: {
        fontFamily: "monospace",
        fontSize: 12,
    },
    closeBtn: {
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: "#007AFF",
        borderRadius: 10,
        alignSelf: "flex-start",
    },
    closeBtnText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});
