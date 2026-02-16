import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/failures/index.tsx
import { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ErrorState } from "@/lib/ui/ScreenStates";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useFailures } from "@/lib/data/useFailures";
import { useFailuresRange } from "@/lib/data/useFailuresRange";
import { FailureList } from "@/components/failures/FailureList";
import { FailureDetailsModal } from "@/components/failures/FailureDetailsModal";
const DAY_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function isValidDayKey(s) {
    return DAY_KEY_REGEX.test(s);
}
export default function FailuresScreen() {
    const today = useMemo(() => getTodayDayKey(), []);
    const [mode, setMode] = useState("day");
    const [day, setDay] = useState(today);
    const [start, setStart] = useState(today);
    const [end, setEnd] = useState(today);
    const [selectedFailure, setSelectedFailure] = useState(null);
    const dayState = useFailures({ day: isValidDayKey(day) ? day : today, limit: 100 }, { enabled: mode === "day" });
    const rangeState = useFailuresRange({
        start: isValidDayKey(start) ? start : today,
        end: isValidDayKey(end) ? end : today,
        limit: 100,
    }, { mode: "all", maxItems: 500, enabled: mode === "range" });
    const state = mode === "day" ? dayState : rangeState;
    const truncated = mode === "range" && rangeState.status === "ready" ? rangeState.data.truncated : false;
    const onItemPress = useCallback((item) => {
        setSelectedFailure(item);
    }, []);
    const subtitle = useMemo(() => "Failures are immutable records of failed, rejected, or missing data. This screen is read-only.", []);
    return (_jsxs(ModuleScreenShell, { title: "Failures", subtitle: subtitle, children: [_jsxs(View, { style: styles.controls, children: [_jsxs(View, { style: styles.modeRow, children: [_jsx(Pressable, { onPress: () => setMode("day"), style: [styles.modeBtn, mode === "day" && styles.modeBtnActive], children: _jsx(Text, { style: [styles.modeBtnText, mode === "day" && styles.modeBtnTextActive], children: "Day" }) }), _jsx(Pressable, { onPress: () => setMode("range"), style: [styles.modeBtn, mode === "range" && styles.modeBtnActive], children: _jsx(Text, { style: [styles.modeBtnText, mode === "range" && styles.modeBtnTextActive], children: "Range" }) })] }), mode === "day" ? (_jsxs(View, { style: styles.inputRow, children: [_jsx(Text, { style: styles.inputLabel, children: "Day (YYYY-MM-DD)" }), _jsx(TextInput, { style: styles.input, value: day, onChangeText: setDay, placeholder: today, placeholderTextColor: "#8E8E93" })] })) : (_jsxs(View, { style: styles.rangeRow, children: [_jsxs(View, { style: styles.inputRow, children: [_jsx(Text, { style: styles.inputLabel, children: "Start" }), _jsx(TextInput, { style: styles.input, value: start, onChangeText: setStart, placeholder: today, placeholderTextColor: "#8E8E93" })] }), _jsxs(View, { style: styles.inputRow, children: [_jsx(Text, { style: styles.inputLabel, children: "End" }), _jsx(TextInput, { style: styles.input, value: end, onChangeText: setEnd, placeholder: today, placeholderTextColor: "#8E8E93" })] })] }))] }), state.status === "partial" ? (_jsxs(View, { style: styles.infoCard, children: [_jsx(Text, { style: styles.infoTitle, children: "Loading failures\u2026" }), _jsx(Text, { style: styles.infoText, children: "If failures exist, they will be shown." })] })) : null, state.status === "error" ? (_jsx(ErrorState, { title: "Failed to load failures", message: state.error, requestId: state.requestId, onRetry: () => state.refetch(), isContractError: state.reason === "contract" })) : null, state.status === "ready" ? (_jsx(FailureList, { items: state.data.items, truncated: truncated, onItemPress: onItemPress })) : null, selectedFailure ? (_jsx(FailureDetailsModal, { item: selectedFailure, onClose: () => setSelectedFailure(null) })) : null] }));
}
const styles = StyleSheet.create({
    controls: {
        gap: 12,
    },
    modeRow: {
        flexDirection: "row",
        gap: 8,
    },
    modeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: "#E5E5EA",
    },
    modeBtnActive: {
        backgroundColor: "#007AFF",
    },
    modeBtnText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1C1C1E",
    },
    modeBtnTextActive: {
        color: "#FFFFFF",
    },
    inputRow: {
        gap: 4,
    },
    rangeRow: {
        flexDirection: "row",
        gap: 12,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: "600",
        opacity: 0.8,
    },
    input: {
        fontSize: 14,
        padding: 10,
        borderRadius: 10,
        backgroundColor: "#F2F2F7",
        borderWidth: 1,
        borderColor: "#E5E5EA",
    },
    infoCard: {
        backgroundColor: "#F2F2F7",
        borderRadius: 16,
        padding: 14,
        gap: 6,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: "800",
    },
    infoText: {
        fontSize: 13,
        opacity: 0.75,
    },
});
