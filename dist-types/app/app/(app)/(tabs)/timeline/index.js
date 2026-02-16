import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/(tabs)/timeline/index.tsx
import { FlatList, View, Text, StyleSheet, Pressable, Modal, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer, EmptyState } from "@/lib/ui/ScreenStates";
import { FailClosed } from "@/lib/ui/FailClosed";
import { OfflineBanner } from "@/lib/ui/OfflineBanner";
import { TruthIndicator } from "@/lib/ui/TruthIndicators";
import { useTimeline } from "@/lib/data/useTimeline";
import { useMemo, useState, useCallback } from "react";
import { getRangeForViewMode, shiftAnchor, } from "@/lib/time/timelineRange";
const VIEW_MODES = [
    { id: "day", label: "7d" },
    { id: "week", label: "14d" },
    { id: "month", label: "30d" },
];
const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
export default function TimelineIndexScreen() {
    const router = useRouter();
    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const [anchorDay, setAnchorDay] = useState(today);
    const [viewMode, setViewMode] = useState("week");
    const [jumpModalVisible, setJumpModalVisible] = useState(false);
    const [jumpInput, setJumpInput] = useState("");
    const range = useMemo(() => getRangeForViewMode(anchorDay, viewMode), [anchorDay, viewMode]);
    const timeline = useTimeline(range, { enabled: true });
    const outcome = useMemo(() => timeline.status === "partial"
        ? { status: "partial" }
        : timeline.status === "error"
            ? {
                status: "error",
                error: timeline.error,
                requestId: timeline.requestId,
                reason: timeline.reason,
            }
            : { status: "ready", data: timeline.data }, [timeline]);
    const fromCache = timeline.status === "ready" && timeline.fromCache === true;
    const goPrev = useCallback(() => {
        const delta = viewMode === "day" ? 7 : viewMode === "week" ? 14 : 30;
        setAnchorDay((d) => shiftAnchor(d, -delta));
    }, [viewMode]);
    const goNext = useCallback(() => {
        const delta = viewMode === "day" ? 7 : viewMode === "week" ? 14 : 30;
        setAnchorDay((d) => shiftAnchor(d, delta));
    }, [viewMode]);
    const handleJumpSubmit = useCallback(() => {
        const v = jumpInput.trim();
        if (YYYY_MM_DD.test(v) && !Number.isNaN(Date.parse(v + "T12:00:00.000Z"))) {
            setAnchorDay(v);
            setJumpModalVisible(false);
            setJumpInput("");
        }
    }, [jumpInput]);
    return (_jsx(ScreenContainer, { children: _jsx(FailClosed, { outcome: outcome, onRetry: () => timeline.refetch(), loadingMessage: "Loading timeline\u2026", children: (data) => {
                const days = data.days;
                return (_jsxs(View, { style: styles.main, children: [_jsx(OfflineBanner, { isOffline: fromCache }), _jsxs(View, { style: styles.scroll, children: [_jsx(Text, { style: styles.title, children: "Timeline" }), _jsx(Text, { style: styles.subtitle, children: "Day list with presence and light counts" }), _jsxs(View, { style: styles.navRow, children: [_jsx(View, { style: styles.viewModeRow, children: VIEW_MODES.map((m) => (_jsx(Pressable, { style: [
                                                    styles.viewModeBtn,
                                                    viewMode === m.id && styles.viewModeBtnActive,
                                                ], onPress: () => setViewMode(m.id), children: _jsx(Text, { style: [
                                                        styles.viewModeBtnText,
                                                        viewMode === m.id && styles.viewModeBtnTextActive,
                                                    ], children: m.label }) }, m.id))) }), _jsxs(View, { style: styles.navButtons, children: [_jsx(Pressable, { style: styles.navBtn, onPress: goPrev, children: _jsx(Text, { style: styles.navBtnText, children: "\u2039" }) }), _jsx(Pressable, { style: styles.navBtn, onPress: goNext, children: _jsx(Text, { style: styles.navBtnText, children: "\u203A" }) }), _jsx(Pressable, { style: styles.jumpBtn, onPress: () => setJumpModalVisible(true), children: _jsx(Text, { style: styles.jumpBtnText, children: "Jump" }) })] })] }), days.length === 0 ? (_jsx(EmptyState, { title: "No days", description: "No timeline data for this range.", explanation: "Try a different date range or use Jump to go to another date." })) : (_jsx(FlatList, { data: days, keyExtractor: (d) => d.day, renderItem: ({ item: d }) => (_jsxs(Pressable, { style: styles.row, onPress: () => router.push({
                                            pathname: "/(app)/(tabs)/timeline/[day]",
                                            params: { day: d.day },
                                        }), accessibilityLabel: `Day ${d.day}, ${d.canonicalCount} events`, children: [_jsx(Text, { style: styles.rowDay, children: d.day }), _jsxs(View, { style: styles.badges, children: [_jsxs(Text, { style: styles.badge, children: [d.canonicalCount, " events"] }), d.hasIncompleteEvents && (_jsx(TruthIndicator, { type: "incomplete", label: `${d.incompleteCount ?? 0} incomplete` })), d.dayCompletenessState && (_jsx(Text, { style: styles.badge, children: d.dayCompletenessState })), d.uncertaintyStateRollup?.hasUncertain && (_jsx(TruthIndicator, { type: "uncertain" })), d.hasDailyFacts && (_jsx(Text, { style: styles.badge, children: "facts" })), d.hasInsights && (_jsx(Text, { style: styles.badge, children: "insights" })), d.hasIntelligenceContext && (_jsx(Text, { style: styles.badge, children: "context" })), d.hasDerivedLedger && (_jsx(Text, { style: styles.badge, children: "ledger" })), d.missingReasons && d.missingReasons.length > 0 && (_jsx(Text, { style: styles.badgeMissing, children: d.missingReasons.join(", ") }))] })] })), ItemSeparatorComponent: () => _jsx(View, { style: styles.listGap }), ListFooterComponent: _jsx(View, { style: styles.listFooter }), initialNumToRender: 14, maxToRenderPerBatch: 10, windowSize: 5, removeClippedSubviews: true, scrollEventThrottle: 16 })), _jsx(Modal, { visible: jumpModalVisible, transparent: true, animationType: "fade", onRequestClose: () => setJumpModalVisible(false), children: _jsx(Pressable, { style: styles.modalOverlay, onPress: () => setJumpModalVisible(false), children: _jsxs(Pressable, { style: styles.modalContent, onPress: (e) => e.stopPropagation(), children: [_jsx(Text, { style: styles.modalTitle, children: "Jump to date" }), _jsx(TextInput, { style: styles.jumpInput, placeholder: "YYYY-MM-DD", value: jumpInput, onChangeText: setJumpInput, autoCapitalize: "none", autoCorrect: false }), _jsxs(View, { style: styles.modalButtons, children: [_jsx(Pressable, { style: styles.modalBtn, onPress: () => setJumpModalVisible(false), children: _jsx(Text, { style: styles.modalBtnText, children: "Cancel" }) }), _jsx(Pressable, { style: [styles.modalBtn, styles.modalBtnPrimary], onPress: handleJumpSubmit, children: _jsx(Text, { style: styles.modalBtnTextPrimary, children: "Go" }) })] })] }) }) })] })] }));
            } }) }));
}
const styles = StyleSheet.create({
    main: { flex: 1 },
    scroll: { flex: 1, padding: 16, paddingBottom: 40 },
    listHeader: { height: 16 },
    listFooter: { height: 40 },
    listGap: { height: 6 },
    title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
    subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
    navRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 16,
        marginBottom: 8,
    },
    viewModeRow: { flexDirection: "row", gap: 4 },
    viewModeBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: "#F2F2F7",
    },
    viewModeBtnActive: { backgroundColor: "#1C1C1E" },
    viewModeBtnText: { fontSize: 14, fontWeight: "600", color: "#8E8E93" },
    viewModeBtnTextActive: { color: "#FFFFFF" },
    navButtons: { flexDirection: "row", gap: 8, alignItems: "center" },
    navBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: "#F2F2F7",
        justifyContent: "center",
        alignItems: "center",
    },
    navBtnText: { fontSize: 20, fontWeight: "700", color: "#1C1C1E" },
    jumpBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: "#F2F2F7",
    },
    jumpBtnText: { fontSize: 14, fontWeight: "600", color: "#007AFF" },
    list: {
        marginTop: 16,
        gap: 6,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#F2F2F7",
        borderRadius: 12,
    },
    rowDay: { fontSize: 17, fontWeight: "600", color: "#1C1C1E" },
    badges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    badge: { fontSize: 12, color: "#8E8E93", fontWeight: "600" },
    badgeIncomplete: { fontSize: 12, color: "#8B6914", fontWeight: "600" },
    badgeUncertain: { fontSize: 12, color: "#6B4E99", fontWeight: "600" },
    badgeMissing: { fontSize: 11, color: "#8E8E93", fontStyle: "italic", maxWidth: 120 },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 24,
        width: "100%",
        maxWidth: 320,
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#1C1C1E", marginBottom: 12 },
    jumpInput: {
        borderWidth: 1,
        borderColor: "#C7C7CC",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    modalButtons: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
    modalBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: "#F2F2F7",
    },
    modalBtnPrimary: { backgroundColor: "#007AFF" },
    modalBtnText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
    modalBtnTextPrimary: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
});
