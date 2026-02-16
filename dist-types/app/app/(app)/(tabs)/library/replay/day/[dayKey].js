import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
// app/(app)/(tabs)/library/replay/day/[dayKey].tsx
// Sprint 5 — Replay & "As-Of" Time Travel UI
// User can replay past truth for a given day; powered by GET /users/me/derived-ledger/snapshot
import { ScrollView, View, Text, StyleSheet, Pressable, Modal, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer, LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { useDerivedLedgerRuns } from "@/lib/data/useDerivedLedgerRuns";
import { useDerivedLedgerSnapshot } from "@/lib/data/useDerivedLedgerSnapshot";
import { useMemo, useState, useEffect } from "react";
const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
function formatIso(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    return d.toLocaleString();
}
function ReplaySection({ title, children, defaultExpanded = false }) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    return (_jsxs(View, { style: styles.section, children: [_jsx(Pressable, { style: styles.sectionToggle, onPress: () => setExpanded(!expanded), children: _jsxs(Text, { style: styles.sectionToggleText, children: [expanded ? "▼" : "▶", " ", title] }) }), expanded && _jsx(View, { style: styles.sectionContent, children: children })] }));
}
const REPLAY_EXPLANATION = `Replay lets you view the derived truth for a day as it was stored at a specific point in time.

Each "run" represents a computation that produced daily facts, intelligence context, and insights. Past views never change—determinism is preserved.

This supports auditability: you can see exactly what Oli knew, and when.`;
export default function ReplayDayScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const dayParam = params.dayKey ?? "";
    const day = YYYY_MM_DD.test(dayParam) ? dayParam : "";
    const [whatIsModalVisible, setWhatIsModalVisible] = useState(false);
    const [asOfInput, setAsOfInput] = useState("");
    const [selectedRunId, setSelectedRunId] = useState(null);
    const runs = useDerivedLedgerRuns(day, { enabled: !!day });
    const asOfIso = useMemo(() => {
        if (!asOfInput.trim())
            return undefined;
        const d = new Date(asOfInput.trim());
        if (Number.isNaN(d.getTime()))
            return undefined;
        return d.toISOString();
    }, [asOfInput]);
    const runsData = runs.status === "ready" ? runs.data : null;
    const snapshotArgs = useMemo(() => {
        const runId = asOfIso
            ? undefined
            : (selectedRunId ?? runsData?.latestRunId ?? runsData?.runs[0]?.runId ?? undefined);
        return {
            day,
            ...(runId !== undefined ? { runId } : {}),
            ...(asOfIso ? { asOf: asOfIso } : {}),
        };
    }, [day, selectedRunId, runsData?.latestRunId, runsData?.runs, asOfIso]);
    const snapshot = useDerivedLedgerSnapshot(snapshotArgs, {
        enabled: !!day && (!!snapshotArgs.runId || !!snapshotArgs.asOf),
    });
    const effectiveComputedAt = useMemo(() => {
        if (snapshot.status === "ready")
            return snapshot.data.computedAt;
        return null;
    }, [snapshot]);
    const bannerMode = useMemo(() => {
        if (asOfIso)
            return { type: "asOf", value: asOfIso };
        if (effectiveComputedAt)
            return { type: "run", value: effectiveComputedAt };
        return null;
    }, [asOfIso, effectiveComputedAt]);
    const isContractError = (runs.status === "error" && runs.reason === "contract") ||
        (snapshot.status === "error" && snapshot.reason === "contract");
    if (!day) {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: "Invalid day parameter" }) }));
    }
    if (runs.status === "error" && isContractError) {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: runs.error, requestId: runs.requestId, onRetry: () => runs.refetch(), isContractError: true }) }));
    }
    if (snapshot.status === "error" && isContractError) {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: snapshot.error, requestId: snapshot.requestId, onRetry: () => snapshot.refetch(), isContractError: true }) }));
    }
    if (runs.status === "partial") {
        return (_jsx(ScreenContainer, { children: _jsx(LoadingState, { message: "Loading runs\u2026" }) }));
    }
    if (runsData && runsData.runs.length === 0 && !asOfIso) {
        return (_jsx(ScreenContainer, { children: _jsx(EmptyState, { title: "No derived runs", description: "No computed runs exist for this day. Derived truth will appear after the pipeline runs." }) }));
    }
    const defaultRunId = runsData ? (runsData.latestRunId ?? runsData.runs[0]?.runId) : null;
    useEffect(() => {
        if (runs.status === "ready" && !selectedRunId && !asOfIso && defaultRunId) {
            setSelectedRunId(defaultRunId);
        }
    }, [runs.status, runsData?.latestRunId, runsData?.runs, selectedRunId, asOfIso, defaultRunId]);
    if (snapshot.status === "partial") {
        return (_jsx(ScreenContainer, { children: _jsx(LoadingState, { message: "Loading snapshot\u2026" }) }));
    }
    if (snapshot.status === "error" && !isContractError) {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: snapshot.error, requestId: snapshot.requestId, onRetry: () => snapshot.refetch() }) }));
    }
    const snapshotData = snapshot.status === "ready" ? snapshot.data : null;
    return (_jsx(ScreenContainer, { children: _jsxs(ScrollView, { contentContainerStyle: styles.scroll, children: [_jsx(Text, { style: styles.title, children: "Replay" }), _jsx(Text, { style: styles.subtitle, children: day }), bannerMode && (_jsx(View, { style: styles.banner, children: _jsxs(Text, { style: styles.bannerText, children: ["Viewing past truth", " ", bannerMode.type === "run"
                                ? `as of ${formatIso(bannerMode.value)}`
                                : `as of ${formatIso(bannerMode.value)}`] }) })), _jsx(Pressable, { style: styles.whatIsLink, onPress: () => setWhatIsModalVisible(true), children: _jsx(Text, { style: styles.whatIsLinkText, children: "What is this?" }) }), _jsx(Modal, { visible: whatIsModalVisible, transparent: true, animationType: "fade", onRequestClose: () => setWhatIsModalVisible(false), children: _jsx(Pressable, { style: styles.modalOverlay, onPress: () => setWhatIsModalVisible(false), children: _jsxs(Pressable, { style: styles.modalContent, onPress: (e) => e.stopPropagation(), children: [_jsx(Text, { style: styles.modalTitle, children: "What is Replay?" }), _jsx(Text, { style: styles.modalBody, children: REPLAY_EXPLANATION }), _jsx(Pressable, { style: styles.modalClose, onPress: () => setWhatIsModalVisible(false), children: _jsx(Text, { style: styles.modalCloseText, children: "Close" }) })] }) }) }), runsData && (_jsxs(View, { style: styles.runSelector, children: [_jsx(Text, { style: styles.sectionTitle, children: "Run" }), runsData.runs.map((r) => (_jsx(RunRow, { run: r, selected: selectedRunId === r.runId && !asOfIso, onSelect: () => {
                                setSelectedRunId(r.runId);
                                setAsOfInput("");
                            } }, r.runId)))] })), _jsxs(View, { style: styles.asOfSection, children: [_jsx(Text, { style: styles.sectionTitle, children: "As-of time (optional)" }), _jsx(Text, { style: styles.asOfHint, children: "Enter ISO 8601 timestamp to view truth as of that moment. API supports asOf." }), _jsx(TextInput, { style: styles.asOfInput, value: asOfInput, onChangeText: setAsOfInput, placeholder: "e.g. 2026-02-08T12:00:00Z", placeholderTextColor: "#8E8E93", autoCapitalize: "none", autoCorrect: false })] }), snapshotData && (_jsx(ReplayContent, { data: snapshotData })), _jsx(ReplaySection, { title: "Provenance", defaultExpanded: false, children: _jsx(View, { style: styles.card, children: snapshotData && (_jsxs(_Fragment, { children: [_jsx(Text, { style: styles.fieldLabel, children: "runId" }), _jsx(Text, { style: styles.fieldValue, children: snapshotData.runId }), _jsx(Text, { style: styles.fieldLabel, children: "computedAt" }), _jsx(Text, { style: styles.fieldValue, children: snapshotData.computedAt }), _jsx(Text, { style: styles.fieldLabel, children: "Snapshot day" }), _jsx(Text, { style: styles.fieldValue, children: snapshotData.day }), _jsx(Text, { style: styles.fieldLabel, children: "Endpoints used" }), _jsx(Text, { style: styles.fieldValue, children: "runs, snapshot" })] })) }) }), _jsx(Pressable, { style: styles.viewCurrentLink, onPress: () => router.push(`/(app)/(tabs)/timeline/${day}`), children: _jsx(Text, { style: styles.viewCurrentLinkText, children: "View current truth" }) })] }) }));
}
function RunRow({ run, selected, onSelect, }) {
    return (_jsxs(Pressable, { style: [styles.runRow, selected && styles.runRowSelected], onPress: onSelect, children: [_jsx(Text, { style: styles.runRowTime, children: formatIso(run.computedAt) }), _jsx(Text, { style: styles.runRowId, children: run.runId })] }));
}
function ReplayContent({ data }) {
    return (_jsxs(View, { style: styles.contentSection, children: [_jsx(Text, { style: styles.sectionTitle, children: "Derived truth" }), _jsxs(View, { style: styles.card, children: [data.dailyFacts && (_jsxs(View, { style: styles.summaryRow, children: [_jsx(Text, { style: styles.fieldLabel, children: "Daily facts" }), _jsx(Text, { style: styles.fieldValue, children: "Present" })] })), data.intelligenceContext && (_jsxs(View, { style: styles.summaryRow, children: [_jsx(Text, { style: styles.fieldLabel, children: "Intelligence context" }), _jsx(Text, { style: styles.fieldValue, children: "Present" })] })), data.insights && (_jsxs(View, { style: styles.summaryRow, children: [_jsx(Text, { style: styles.fieldLabel, children: "Insights" }), _jsxs(Text, { style: styles.fieldValue, children: [data.insights.count, " item(s)"] })] })), !data.dailyFacts && !data.intelligenceContext && !data.insights && (_jsx(Text, { style: styles.fieldValue, children: "No derived snapshots in this run" }))] })] }));
}
const styles = StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
    subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
    banner: {
        marginTop: 16,
        padding: 12,
        backgroundColor: "#E8F4FD",
        borderRadius: 12,
    },
    bannerText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1C1C1E",
    },
    whatIsLink: {
        marginTop: 12,
    },
    whatIsLinkText: {
        fontSize: 15,
        color: "#007AFF",
        textDecorationLine: "underline",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 24,
        maxWidth: 340,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1C1C1E",
        marginBottom: 12,
    },
    modalBody: {
        fontSize: 15,
        color: "#3C3C43",
        lineHeight: 22,
    },
    modalClose: {
        marginTop: 20,
        alignSelf: "flex-end",
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: "#F2F2F7",
        borderRadius: 12,
    },
    modalCloseText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1C1C1E",
    },
    runSelector: { marginTop: 24 },
    sectionTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#1C1C1E",
        marginBottom: 12,
    },
    runRow: {
        padding: 14,
        backgroundColor: "#F2F2F7",
        borderRadius: 12,
        marginBottom: 6,
    },
    runRowSelected: {
        backgroundColor: "#E8F4FD",
        borderWidth: 2,
        borderColor: "#007AFF",
    },
    runRowTime: { fontSize: 15, color: "#1C1C1E" },
    runRowId: { fontSize: 12, color: "#8E8E93", marginTop: 4, fontFamily: "monospace" },
    asOfSection: { marginTop: 20 },
    asOfHint: {
        fontSize: 13,
        color: "#8E8E93",
        marginBottom: 8,
    },
    asOfInput: {
        padding: 12,
        backgroundColor: "#F2F2F7",
        borderRadius: 12,
        fontSize: 15,
        color: "#1C1C1E",
    },
    contentSection: { marginTop: 24 },
    section: { marginTop: 20 },
    sectionToggle: {
        padding: 12,
        backgroundColor: "#F2F2F7",
        borderRadius: 12,
    },
    sectionToggleText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
    sectionContent: { marginTop: 8 },
    card: {
        padding: 12,
        backgroundColor: "#F9F9FB",
        borderRadius: 12,
        gap: 8,
    },
    summaryRow: { marginBottom: 4 },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: "#8E8E93", marginTop: 8 },
    fieldValue: { fontSize: 15, color: "#1C1C1E", lineHeight: 20 },
    viewCurrentLink: {
        marginTop: 24,
        padding: 12,
        alignItems: "center",
    },
    viewCurrentLinkText: {
        fontSize: 15,
        color: "#007AFF",
        textDecorationLine: "underline",
    },
});
