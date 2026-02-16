import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
export default function TabsLayout() {
    return (_jsxs(Tabs, { initialRouteName: "dash", screenOptions: {
            headerShown: false,
            tabBarActiveTintColor: "#1C1C1E",
            tabBarInactiveTintColor: "#8E8E93",
            tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        }, children: [_jsx(Tabs.Screen, { name: "dash", options: {
                    title: "Dash",
                    tabBarAccessibilityLabel: "Dash",
                } }), _jsx(Tabs.Screen, { name: "timeline", options: {
                    title: "Timeline",
                    tabBarAccessibilityLabel: "Timeline",
                } }), _jsx(Tabs.Screen, { name: "manage", options: {
                    title: "Manage",
                    tabBarAccessibilityLabel: "Manage",
                } }), _jsx(Tabs.Screen, { name: "library", options: {
                    title: "Library",
                    tabBarAccessibilityLabel: "Library",
                } }), _jsx(Tabs.Screen, { name: "stats", options: {
                    title: "Stats",
                    tabBarAccessibilityLabel: "Stats",
                } })] }));
}
