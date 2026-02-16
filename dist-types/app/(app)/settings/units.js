import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/settings/units.tsx
import { useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { usePreferences } from "../../../lib/preferences/PreferencesProvider";
export default function UnitsSettingsScreen() {
    const { state, setMassUnit } = usePreferences();
    const choices = useMemo(() => [
        { key: "lb", label: "Pounds (lb)" },
        { key: "kg", label: "Kilograms (kg)" },
    ], []);
    const selected = state.preferences.units.mass;
    return (_jsxs(View, { style: { flex: 1, padding: 16, gap: 16 }, children: [_jsxs(View, { style: { gap: 6 }, children: [_jsx(Text, { style: { fontSize: 22, fontWeight: "700" }, children: "Units" }), _jsx(Text, { style: { opacity: 0.7 }, children: "These settings only affect display. Stored health truth is never rewritten when you change units." })] }), _jsxs(View, { style: { gap: 10 }, children: [_jsx(Text, { style: { fontSize: 16, fontWeight: "600" }, children: "Weight" }), choices.map((c) => {
                        const isSelected = c.key === selected;
                        return (_jsxs(Pressable, { accessibilityRole: "button", accessibilityLabel: `Set weight unit to ${c.label}`, onPress: () => setMassUnit(c.key), style: {
                                borderWidth: 1,
                                borderColor: isSelected ? "black" : "rgba(0,0,0,0.2)",
                                padding: 14,
                                borderRadius: 12,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }, children: [_jsx(Text, { style: { fontSize: 16, fontWeight: isSelected ? "700" : "500" }, children: c.label }), isSelected ? _jsx(Text, { style: { fontWeight: "700" }, children: "\u2713" }) : null] }, c.key));
                    })] }), state.status === "loading" ? (_jsxs(View, { style: { flexDirection: "row", alignItems: "center", gap: 10 }, children: [_jsx(ActivityIndicator, {}), _jsx(Text, { children: "Saving\u2026" })] })) : null, state.status === "error" ? (_jsxs(Text, { style: { color: "crimson" }, children: ["Couldn\u2019t save preferences: ", state.message] })) : null] }));
}
