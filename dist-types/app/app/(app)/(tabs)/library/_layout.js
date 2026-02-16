import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/(tabs)/library/_layout.tsx
import { Stack } from "expo-router";
export default function LibraryLayout() {
    return (_jsxs(Stack, { screenOptions: { headerShown: false }, children: [_jsx(Stack.Screen, { name: "index" }), _jsx(Stack.Screen, { name: "search" }), _jsx(Stack.Screen, { name: "[category]" }), _jsx(Stack.Screen, { name: "lineage/[canonicalEventId]", options: { title: "Lineage" } }), _jsx(Stack.Screen, { name: "replay/day/[dayKey]", options: { title: "Replay" } })] }));
}
