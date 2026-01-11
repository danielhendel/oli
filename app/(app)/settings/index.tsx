// app/(app)/settings/index.tsx
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { ModuleSectionLinkRow } from "@/lib/ui/ModuleSectionLinkRow";
import { getModuleSections } from "@/lib/modules/moduleSectionRoutes";
import { getSectionReadiness } from "@/lib/modules/moduleReadiness";

type Section = ReturnType<typeof getModuleSections>[number];

const getStringEnv = (key: string): string | undefined => {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
};

export default function SettingsHomeScreen() {
  const router = useRouter();

  // preserve typing from module system
  const sections: Section[] = getModuleSections("settings");

  /**
   * Debug tools must never ship to production.
   * APP_ENV is preferred (explicit), NODE_ENV is fallback-safe.
   */
  const appEnv = getStringEnv("APP_ENV") ?? getStringEnv("NODE_ENV") ?? "development";
  const showDebug = appEnv !== "production";

  // Prevent duplicate "Account" row if it's already present in module sections.
  const normalizedTitle = (s: { title: string }) => s.title.trim().toLowerCase();
  const hasAccountInSections = sections.some((s) => normalizedTitle(s) === "account");

  return (
    <ModuleScreenShell title="Settings" subtitle="Account & privacy">
      <View style={styles.list}>
        {sections.map((s) => {
          const readiness = getSectionReadiness(s.id);

          return (
            <ModuleSectionLinkRow
              key={s.id}
              title={s.title}
              disabled={readiness.disabled}
              onPress={() => router.push(s.href)}
              {...(readiness.badge ? { badge: readiness.badge } : {})}
            />
          );
        })}

        {!hasAccountInSections ? (
          <ModuleSectionLinkRow
            title="Account"
            disabled={false}
            onPress={() => router.push("/(app)/settings/account")}
          />
        ) : null}

        {showDebug ? (
          <>
            <ModuleSectionLinkRow
              title="Debug Token"
              badge="Dev"
              disabled={false}
              onPress={() => router.push("/debug/token")}
            />
            <ModuleSectionLinkRow
              title="Debug API Smoke"
              badge="Dev"
              disabled={false}
              onPress={() => router.push("/debug/api-smoke")}
            />
            <ModuleSectionLinkRow
              title="Debug Backend Health"
              badge="Dev"
              disabled={false}
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
