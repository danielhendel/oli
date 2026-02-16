import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Stack } from "expo-router";
export default function DebugLayout() {
    return (_jsxs(Stack, { screenOptions: { headerShown: true }, children: [_jsx(Stack.Screen, { name: "index", options: { title: "Debug" } }), _jsx(Stack.Screen, { name: "token", options: { title: "Token" } }), _jsx(Stack.Screen, { name: "api-smoke", options: { title: "API Smoke" } })] }));
}
