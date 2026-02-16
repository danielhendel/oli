import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/_layout.tsx
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../lib/auth/AuthProvider";
import { PreferencesProvider } from "../lib/preferences/PreferencesProvider";
function RouteGuard() {
    const { user, initializing } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    useEffect(() => {
        if (initializing)
            return;
        const top = segments[0]; // "(auth)" | "(app)" | "debug" | ...
        const inAuthGroup = top === "(auth)";
        const inDebug = top === "debug";
        // ✅ Allow debug routes even when signed out (for token tools, API testing, etc.)
        if (inDebug)
            return;
        if (!user && !inAuthGroup) {
            router.replace("/(auth)/sign-in");
            return;
        }
        if (user && inAuthGroup) {
            router.replace("/(app)/command-center");
        }
    }, [initializing, router, segments, user]);
    return null;
}
export default function RootLayout() {
    return (_jsx(AuthProvider, { children: _jsxs(PreferencesProvider, { children: [_jsx(StatusBar, { style: "auto" }), _jsx(RouteGuard, {}), _jsxs(Stack, { screenOptions: { headerShown: false }, children: [_jsx(Stack.Screen, { name: "(auth)" }), _jsx(Stack.Screen, { name: "(app)" }), _jsx(Stack.Screen, { name: "index" }), _jsx(Stack.Screen, { name: "debug" })] })] }) }));
}
