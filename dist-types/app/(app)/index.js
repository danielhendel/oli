import { jsx as _jsx } from "react/jsx-runtime";
import { Redirect } from "expo-router";
export default function AppIndex() {
    return _jsx(Redirect, { href: "/(app)/command-center" });
}
