import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Stack } from "expo-router";
export default function DeleteAccountLayout() {
    return (_jsxs(Stack, { children: [_jsx(Stack.Screen, { name: "index", options: {
                    title: "Delete account",
                } }), _jsx(Stack.Screen, { name: "confirm", options: {
                    title: "Confirm deletion",
                } }), _jsx(Stack.Screen, { name: "receipt", options: {
                    title: "Request received",
                    headerBackVisible: false,
                    gestureEnabled: false,
                } })] }));
}
