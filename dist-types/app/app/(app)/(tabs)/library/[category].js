import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/(tabs)/library/[category].tsx
import { FlatList, View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { LoadingState, ErrorState, EmptyState } from "@/lib/ui/ScreenStates";
import { useEvents } from "@/lib/data/useEvents";
import { useMemo } from "react";
const CATEGORY_KINDS = {
    strength: ["strength_workout"],
    cardio: ["steps", "workout"],
    sleep: ["sleep"],
    hrv: ["hrv"],
    labs: [],
    uploads: [],
    failures: [],
};
function getRangeForEvents() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
    };
}
function formatIsoToShort(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return iso;
    return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    });
}
function groupEventsByDay(items) {
    const map = new Map();
    for (const item of items) {
        const day = item.day;
        const list = map.get(day) ?? [];
        list.push(item);
        map.set(day, list);
    }
    for (const list of map.values()) {
        list.sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
    }
    return map;
}
export default function LibraryCategoryScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const category = params.category ?? "strength";
    const kinds = CATEGORY_KINDS[category] ?? [];
    const range = useMemo(() => getRangeForEvents(), []);
    const events = useEvents(kinds.length > 0
        ? { start: range.start, end: range.end, kinds, limit: 100 }
        : { start: range.start, end: range.end, limit: 100 }, { enabled: category !== "uploads" && category !== "failures" });
    const isContractError = events.status === "error" &&
        (events.error?.toLowerCase().includes("invalid") ?? false);
    if (category === "uploads" || category === "failures") {
        return (_jsx(ScreenContainer, { children: _jsxs(View, { style: styles.placeholder, children: [_jsx(Text, { style: styles.title, children: category }), _jsx(Text, { style: styles.subtitle, children: "Use Timeline or Failures screen for uploads and failures." })] }) }));
    }
    if (events.status === "partial") {
        return (_jsx(ScreenContainer, { children: _jsx(LoadingState, { message: "Loading events\u2026" }) }));
    }
    if (events.status === "error") {
        return (_jsx(ScreenContainer, { children: _jsx(ErrorState, { message: events.error, requestId: events.requestId, onRetry: () => events.refetch(), isContractError: isContractError }) }));
    }
    const grouped = groupEventsByDay(events.data.items);
    const days = Array.from(grouped.keys()).sort().reverse();
    if (days.length === 0) {
        return (_jsxs(ScreenContainer, { children: [_jsx(Text, { style: styles.title, children: category }), _jsx(EmptyState, { title: "No events", description: "No events in this category yet." })] }));
    }
    return (_jsx(ScreenContainer, { children: _jsxs(View, { style: styles.scroll, children: [_jsx(Text, { style: styles.title, children: category }), _jsx(Text, { style: styles.subtitle, children: "Day-grouped, reverse chronological" }), _jsx(FlatList, { data: days, keyExtractor: (day) => day, renderItem: ({ item: day }) => (_jsxs(View, { style: styles.daySection, children: [_jsx(Text, { style: styles.dayHeader, children: day }), (grouped.get(day) ?? []).map((ev) => (_jsxs(Pressable, { style: styles.eventRow, onPress: () => router.push({
                                    pathname: "/(app)/event/[id]",
                                    params: { id: ev.id },
                                }), children: [_jsx(Text, { style: styles.eventKind, children: ev.kind }), _jsx(Text, { style: styles.eventTime, children: formatIsoToShort(ev.start) })] }, ev.id)))] })), ItemSeparatorComponent: () => _jsx(View, { style: styles.dayGap }), ListFooterComponent: _jsx(View, { style: styles.listFooter }), initialNumToRender: 10, maxToRenderPerBatch: 5, windowSize: 5 })] }) }));
}
const styles = StyleSheet.create({
    scroll: { flex: 1, padding: 16, paddingBottom: 40 },
    placeholder: { flex: 1, padding: 16 },
    title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
    subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4 },
    daySection: { marginTop: 20 },
    dayGap: { height: 16 },
    listFooter: { height: 40 },
    dayHeader: {
        fontSize: 13,
        fontWeight: "700",
        color: "#8E8E93",
        marginBottom: 8,
    },
    eventRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 14,
        backgroundColor: "#F2F2F7",
        borderRadius: 12,
        marginBottom: 6,
    },
    eventKind: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
    eventTime: { fontSize: 14, color: "#8E8E93" },
});
