import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/(tabs)/timeline/_layout.tsx
import { Stack } from "expo-router";
export default function TimelineLayout() {
    return (_jsxs(Stack, { screenOptions: {
            headerShown: false,
            animation: "slide_from_right",
        }, children: [_jsx(Stack.Screen, { name: "index" }), _jsx(Stack.Screen, { name: "[day]" })] }));
}
