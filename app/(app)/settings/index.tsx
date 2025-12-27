// app/(app)/settings/index.tsx
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";
import { getModuleSections } from "@/lib/modules/moduleSectionRoutes";
import { getSectionReadiness } from "@/lib/modules/moduleReadiness";

export default function SettingsHomeScreen() {
  const router = useRouter();
  const sections = getModuleSections("settings");

  const appEnv = process.env.APP_ENV ?? "development";
  const showDebug = appEnv !== "production";

  return (
    <ModuleScreenShell title="Settings" subtitle="Account & privacy">
      <View style={styles.list}>
        {sections.map((s) => {
          const r = getSectionReadiness(s.id);

          return (
            <ModuleSectionLinkRow
              key={s.id}
              title={s.title}
              disabled={r.disabled}
              onPress={() => router.push(s.href)}
              {...(r.badge ? { badge: r.badge } : {})}
            />
          );
        })}

        {/* Ensure Account actually goes somewhere real */}
        <ModuleSectionLinkRow
          title="Account"
          disabled={false}
          onPress={() => router.push("/settings/account")}
        />

        {showDebug ? (
          <>
            <ModuleSectionLinkRow
              title="Debug token"
              disabled={false}
              badge="Dev"
              onPress={() => router.push("/debug/token")}
            />
            <ModuleSectionLinkRow
              title="Debug API smoke"
              disabled={false}
              badge="Dev"
              onPress={() => router.push("/debug/api-smoke")}
            />
            <ModuleSectionLinkRow
              title="Debug Backend Health"
              disabled={false}
              badge="Dev"
              onPress={() => router.push("/debug/health")}
            />
          </>
        ) : null}
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
});
