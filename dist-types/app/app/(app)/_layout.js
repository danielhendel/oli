import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/_layout.tsx
import { Stack } from "expo-router";
export default function AppLayout() {
    return (_jsxs(Stack, { children: [_jsx(Stack.Screen, { name: "(tabs)", options: { headerShown: false } }), _jsx(Stack.Screen, { name: "event/[id]", options: { title: "Event" } }), _jsx(Stack.Screen, { name: "command-center/index", options: { headerShown: false } }), _jsx(Stack.Screen, { name: "nutrition/index", options: { title: "Nutrition" } }), _jsx(Stack.Screen, { name: "workouts/index", options: { title: "Workouts" } }), _jsx(Stack.Screen, { name: "recovery/index", options: { title: "Recovery" } }), _jsx(Stack.Screen, { name: "failures/index", options: { title: "Failures" } }), _jsx(Stack.Screen, { name: "settings/index", options: { title: "Settings" } }), _jsx(Stack.Screen, { name: "training/strength/log", options: { title: "Log Strength" } }), _jsx(Stack.Screen, { name: "log/index", options: { title: "Quick log" } })] }));
}
