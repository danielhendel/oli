import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/failures/index.tsx
import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useFailuresRange } from "@/lib/data/useFailuresRange";
import { FailureList } from "@/components/failures/FailureList";
const START_OF_TIME_DAY = "1970-01-01";
export default function FailuresScreen() {
    const end = getTodayDayKey();
    const state = useFailuresRange({
        start: START_OF_TIME_DAY,
        end,
        limit: 100,
    }, {
        mode: "all",
        maxItems: 500,
    });
    const subtitle = useMemo(() => "Failures are immutable records of failed, rejected, or missing data. This screen is read-only.", []);
    return (_jsxs(ModuleScreenShell, { title: "Failures", subtitle: subtitle, children: [state.status === "loading" ? (_jsxs(View, { style: styles.infoCard, children: [_jsx(Text, { style: styles.infoTitle, children: "Loading failures\u2026" }), _jsx(Text, { style: styles.infoText, children: "If failures exist, they will be shown." })] })) : null, state.status === "error" ? (_jsxs(View, { style: [styles.infoCard, styles.errorCard], children: [_jsx(Text, { style: styles.errorTitle, children: "Failed to load failures" }), _jsx(Text, { style: styles.infoText, children: state.error }), state.requestId ? _jsxs(Text, { style: styles.requestId, children: ["Request ID: ", state.requestId] }) : null] })) : null, state.status === "ready" ? _jsx(FailureList, { items: state.data.items, truncated: state.data.truncated }) : null] }));
}
const styles = StyleSheet.create({
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
    errorCard: {
        backgroundColor: "#FDECEC",
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: "900",
        color: "#B00020",
    },
    requestId: {
        fontSize: 12,
        opacity: 0.7,
    },
});
