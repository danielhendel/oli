import { jsx as _jsx } from "react/jsx-runtime";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";
import { getModuleSections } from "@/lib/modules/moduleSectionRoutes";
import { getSectionReadiness } from "@/lib/modules/moduleReadiness";
export default function RecoveryHomeScreen() {
    const router = useRouter();
    const sections = getModuleSections("recovery");
    return (_jsx(ModuleScreenShell, { title: "Recovery", subtitle: "Sleep & readiness", children: _jsx(View, { style: styles.list, children: sections.map((s) => {
                const r = getSectionReadiness(s.id);
                return (_jsx(ModuleSectionLinkRow, { title: s.title, disabled: r.disabled, onPress: () => router.push(s.href), ...(r.badge ? { badge: r.badge } : {}) }, s.id));
            }) }) }));
}
const styles = StyleSheet.create({
    list: { gap: 10 },
});
