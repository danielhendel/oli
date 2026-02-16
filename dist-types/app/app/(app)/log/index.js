import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Phase 2 — Minimal logging UX.
 * - "Something happened" quick log (incomplete)
 * - Time: now / earlier / approximate
 * - Content unknown toggle
 * - Backfill mode (select past day; recordedAt remains now)
 * No nudges or prompts. Completeness/uncertainty shown passively.
 */
import { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { ingestRawEventAuthed } from "@/lib/api/ingest";
import { getIdToken } from "@/lib/auth/getIdToken";
import { getLocalTimeZone } from "@/lib/time/timezone";
export default function LogScreen() {
    const router = useRouter();
    const [timeMode, setTimeMode] = useState("now");
    const [backfillDay, setBackfillDay] = useState(null);
    const [contentUnknown, setContentUnknown] = useState(false);
    const [approxStart, setApproxStart] = useState("");
    const [approxEnd, setApproxEnd] = useState("");
    const [earlierDay, setEarlierDay] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const timeZone = getLocalTimeZone();
    const isBackfill = backfillDay !== null && backfillDay !== "";
    const submit = async () => {
        setError(null);
        setSubmitting(true);
        try {
            const token = await getIdToken();
            let occurredAt;
            let recordedAt;
            let provenance;
            if (timeMode === "now") {
                occurredAt = new Date().toISOString();
            }
            else if (timeMode === "earlier" && earlierDay) {
                occurredAt = `${earlierDay}T12:00:00.000Z`;
            }
            else if (timeMode === "approximate" && approxStart && approxEnd) {
                occurredAt = { start: approxStart, end: approxEnd };
            }
            else {
                setError("Please fill in time details.");
                setSubmitting(false);
                return;
            }
            if (isBackfill && backfillDay && /^\d{4}-\d{2}-\d{2}$/.test(backfillDay)) {
                occurredAt = `${backfillDay}T12:00:00.000Z`;
                recordedAt = new Date().toISOString();
                provenance = "backfill";
            }
            else if (isBackfill) {
                setError("Backfill day must be YYYY-MM-DD.");
                setSubmitting(false);
                return;
            }
            const body = {
                provider: "manual",
                kind: "incomplete",
                occurredAt,
                timeZone,
                ...(recordedAt ? { recordedAt } : {}),
                ...(provenance ? { provenance } : {}),
                payload: {},
                uncertaintyState: "incomplete",
                ...(contentUnknown ? { contentUnknown: true } : {}),
            };
            const idempotencyKey = `incomplete_${Date.now()}_${JSON.stringify(body).slice(0, 50)}`;
            const res = await ingestRawEventAuthed(body, token, { idempotencyKey });
            if (res.ok) {
                router.back();
            }
            else {
                setError(res.error ?? "Failed to log");
            }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Failed to log");
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsx(ScreenContainer, { children: _jsxs(ScrollView, { contentContainerStyle: styles.scroll, children: [_jsx(Text, { style: styles.title, children: "Quick log" }), _jsx(Text, { style: styles.subtitle, children: "Something happened. Minimal friction \u2014 no guessing." }), _jsxs(View, { style: styles.section, children: [_jsx(Text, { style: styles.sectionTitle, children: "Time" }), _jsx(View, { style: styles.timeRow, children: ["now", "earlier", "approximate"].map((m) => (_jsx(Pressable, { style: [styles.timeChip, timeMode === m && styles.timeChipActive], onPress: () => setTimeMode(m), children: _jsx(Text, { style: timeMode === m ? styles.timeChipTextActive : styles.timeChipText, children: m === "now" ? "Now" : m === "earlier" ? "Earlier" : "Approximate" }) }, m))) }), timeMode === "earlier" && (_jsx(TextInput, { style: styles.input, placeholder: "YYYY-MM-DD", value: earlierDay, onChangeText: setEarlierDay, autoCapitalize: "none" })), timeMode === "approximate" && (_jsxs(View, { style: styles.approxRow, children: [_jsx(TextInput, { style: [styles.input, styles.approxInput], placeholder: "Start (ISO)", value: approxStart, onChangeText: setApproxStart, autoCapitalize: "none" }), _jsx(TextInput, { style: [styles.input, styles.approxInput], placeholder: "End (ISO)", value: approxEnd, onChangeText: setApproxEnd, autoCapitalize: "none" })] }))] }), _jsxs(View, { style: styles.section, children: [_jsx(Text, { style: styles.sectionTitle, children: "Content" }), _jsx(Pressable, { style: [styles.toggle, contentUnknown && styles.toggleActive], onPress: () => setContentUnknown(!contentUnknown), children: _jsx(Text, { style: contentUnknown ? styles.toggleTextActive : styles.toggleText, children: "Content unknown" }) })] }), _jsxs(View, { style: styles.section, children: [_jsx(Text, { style: styles.sectionTitle, children: "Backfill" }), _jsx(Text, { style: styles.hint, children: "Log for a past day (recordedAt = now, occurredAt = selected day)." }), _jsx(Pressable, { style: [styles.toggle, backfillDay !== null && styles.toggleActive], onPress: () => setBackfillDay(backfillDay !== null ? null : earlierDay || ""), children: _jsx(Text, { style: backfillDay !== null ? styles.toggleTextActive : styles.toggleText, children: backfillDay !== null ? "Backfill ON" : "Backfill OFF" }) }), backfillDay !== null && (_jsx(TextInput, { style: styles.input, placeholder: "YYYY-MM-DD", value: backfillDay, onChangeText: setBackfillDay, autoCapitalize: "none" }))] }), error && (_jsx(View, { style: styles.errorBanner, children: _jsx(Text, { style: styles.errorText, children: error }) })), _jsx(Pressable, { style: [styles.submitBtn, submitting && styles.submitBtnDisabled], onPress: submit, disabled: submitting, children: submitting ? (_jsx(ActivityIndicator, { color: "#fff" })) : (_jsx(Text, { style: styles.submitBtnText, children: "Log" })) })] }) }));
}
const styles = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
    subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4, lineHeight: 22 },
    section: { marginTop: 24 },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E", marginBottom: 8 },
    timeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    timeChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: "#F2F2F7",
    },
    timeChipActive: { backgroundColor: "#1C1C1E" },
    timeChipText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
    timeChipTextActive: { fontSize: 15, fontWeight: "600", color: "#fff" },
    input: {
        marginTop: 8,
        padding: 12,
        backgroundColor: "#F2F2F7",
        borderRadius: 10,
        fontSize: 15,
        color: "#1C1C1E",
    },
    approxRow: { flexDirection: "row", gap: 8, marginTop: 8 },
    approxInput: { flex: 1 },
    toggle: {
        padding: 14,
        backgroundColor: "#F2F2F7",
        borderRadius: 10,
    },
    toggleActive: { backgroundColor: "#1C1C1E" },
    toggleText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
    toggleTextActive: { fontSize: 15, fontWeight: "600", color: "#fff" },
    hint: { fontSize: 13, color: "#8E8E93", marginTop: 4 },
    errorBanner: {
        marginTop: 16,
        padding: 12,
        backgroundColor: "#FFE5E5",
        borderRadius: 10,
    },
    errorText: { fontSize: 14, color: "#C00", fontWeight: "600" },
    submitBtn: {
        marginTop: 32,
        padding: 16,
        backgroundColor: "#007AFF",
        borderRadius: 12,
        alignItems: "center",
    },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
