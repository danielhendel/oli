import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// app/(app)/settings/index.tsx
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";
import { getModuleSections } from "@/lib/modules/moduleSectionRoutes";
import { getSectionReadiness } from "@/lib/modules/moduleReadiness";
const getStringEnv = (key) => {
    const v = process.env[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
};
export default function SettingsHomeScreen() {
    const router = useRouter();
    // preserve typing from module system
    const sections = getModuleSections("settings");
    /**
     * Debug tools must never ship to production.
     * APP_ENV is preferred (explicit), NODE_ENV is fallback-safe.
     */
    const appEnv = getStringEnv("APP_ENV") ?? getStringEnv("NODE_ENV") ?? "development";
    const showDebug = appEnv !== "production";
    // Prevent duplicate "Account" row if it's already present in module sections.
    const normalizedTitle = (s) => s.title.trim().toLowerCase();
    const hasAccountInSections = sections.some((s) => normalizedTitle(s) === "account");
    return (_jsx(ModuleScreenShell, { title: "Settings", subtitle: "Account & privacy", children: _jsxs(View, { style: styles.list, children: [sections.map((s) => {
                    const readiness = getSectionReadiness(s.id);
                    return (_jsx(ModuleSectionLinkRow, { title: s.title, disabled: readiness.disabled, onPress: () => router.push(s.href), ...(readiness.badge ? { badge: readiness.badge } : {}) }, s.id));
                }), !hasAccountInSections ? (_jsx(ModuleSectionLinkRow, { title: "Account", disabled: false, onPress: () => router.push("/(app)/settings/account") })) : null, showDebug ? (_jsxs(_Fragment, { children: [_jsx(ModuleSectionLinkRow, { title: "Debug Token", badge: "Dev", disabled: false, onPress: () => router.push("/debug/token") }), _jsx(ModuleSectionLinkRow, { title: "Debug API Smoke", badge: "Dev", disabled: false, onPress: () => router.push("/debug/api-smoke") }), _jsx(ModuleSectionLinkRow, { title: "Debug Backend Health", badge: "Dev", disabled: false, onPress: () => router.push("/debug/health") })] })) : null] }) }));
}
const styles = StyleSheet.create({
    list: { gap: 10 },
});
