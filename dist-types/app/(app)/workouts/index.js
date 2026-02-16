import { jsx as _jsx } from "react/jsx-runtime";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";
import { getModuleSections } from "@/lib/modules/moduleSectionRoutes";
import { getSectionReadiness } from "@/lib/modules/moduleReadiness";
export default function WorkoutsHomeScreen() {
    const router = useRouter();
    const sections = getModuleSections("workouts");
    return (_jsx(ModuleScreenShell, { title: "Workouts", subtitle: "Strength & cardio", children: _jsx(View, { style: styles.list, children: sections.map((s) => {
                const r = getSectionReadiness(s.id);
                return (_jsx(ModuleSectionLinkRow, { title: s.title, disabled: r.disabled, onPress: () => router.push(s.href), ...(r.badge ? { badge: r.badge } : {}) }, s.id));
            }) }) }));
}
const styles = StyleSheet.create({
    list: { gap: 10 },
});
