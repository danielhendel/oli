// app/(app)/profile/system/[systemId].tsx
// Digital Twin system detail (stack push). Thin: composes the home VM and renders the screen.
import React from "react";
import { type Href, Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useDigitalTwinHome } from "@/lib/features/profile/digitalTwin/useDigitalTwinHome";
import { DigitalTwinSystemScreen } from "@/lib/ui/profile/digitalTwin/DigitalTwinSystemScreen";

function formatUpdated(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ProfileSystemDetailScreen() {
  const params = useLocalSearchParams<{ systemId?: string | string[] }>();
  const router = useRouter();
  const { vm, loading, signedOut } = useDigitalTwinHome();

  const raw = params.systemId;
  const systemId = Array.isArray(raw) ? raw[0] : raw;
  const system = vm.systems.find((s) => s.id === systemId) ?? null;

  const go = (href: string) => router.push(href as Href);
  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/(tabs)/profile" as Href);
  };

  return (
    <>
      <Stack.Screen options={{ title: system?.title ?? "System" }} />
      <DigitalTwinSystemScreen
        system={system}
        loading={loading}
        signedOut={signedOut}
        updatedLabel={formatUpdated(vm.overview.lastUpdated)}
        onPressRow={go}
        onPressCta={go}
        onBack={onBack}
      />
    </>
  );
}
