import { jsx as _jsx } from "react/jsx-runtime";
// app/index.tsx
import { Redirect } from "expo-router";
export default function Index() {
    return _jsx(Redirect, { href: "/(app)" });
}
