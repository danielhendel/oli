// app/(app)/profile/metric/[metricId].tsx
// Digital Twin metric detail (stack push). Blank placeholder for now: resolves the metric label
// from the registry and renders a "coming soon" screen. Unknown / invalid ids render safely.
import React from "react";
import { type Href, Stack, useLocalSearchParams, useRouter } from "expo-router";

import { findDigitalTwinMetric } from "@/lib/features/profile/digitalTwin/digitalTwinSystems";
import { DigitalTwinMetricScreen } from "@/lib/ui/profile/digitalTwin/DigitalTwinMetricScreen";

export default function ProfileMetricDetailScreen() {
  const params = useLocalSearchParams<{ metricId?: string | string[] }>();
  const router = useRouter();

  const raw = params.metricId;
  const metricId = Array.isArray(raw) ? raw[0] : raw;
  const found = metricId ? findDigitalTwinMetric(metricId) : null;
  const title = found?.metric.label ?? "Metric";

  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/(tabs)/profile" as Href);
  };

  return (
    <>
      <Stack.Screen options={{ title }} />
      <DigitalTwinMetricScreen title={title} onBack={onBack} />
    </>
  );
}
