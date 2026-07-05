import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { DailyReadinessCardViewModel } from "@/lib/hooks/useDailyReadinessCard";
import { READINESS_DETAIL_HREF } from "@/lib/hooks/useDailyReadinessCard";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

type Props = {
  vm: DailyReadinessCardViewModel;
};

const HEADLINE_VALUE_TEXT: React.ComponentProps<typeof Text>["style"] = {
  fontSize: 34,
  lineHeight: 40,
  color: UI_TEXT_PRIMARY,
  fontWeight: "700",
  letterSpacing: -0.2,
};

export function DailyReadinessCard({ vm }: Props): React.ReactElement {
  const router = useRouter();

  const loading = vm.status === "partial";
  const error = vm.status === "error" ? vm.message : null;
  const model = vm.status === "ready" ? vm.model : undefined;
  const missingMessage = vm.status === "missing" ? vm.message : null;
  const missingCta = vm.status === "missing" ? vm.cta : undefined;

  const onOpenReadiness = useCallback(() => {
    if (loading || error || vm.status !== "ready") return;
    router.push(READINESS_DETAIL_HREF);
  }, [error, loading, router, vm.status]);

  const onOpenOuraReconnect = useCallback(() => {
    if (missingCta == null) return;
    router.push(missingCta.href as Parameters<typeof router.push>[0]);
  }, [missingCta, router]);

  const headerA11y =
    vm.status === "ready"
      ? vm.accessibilityLabel
      : loading
        ? "Oura Readiness header. Loading."
        : error
          ? "Oura Readiness header. Could not load data."
          : `Oura Readiness header. ${missingMessage ?? "No readiness data."}`;

  const canOpen = vm.status === "ready" && model?.hasAnySignal;

  return (
    <View style={styles.outer} accessibilityLabel="Oura Readiness card">
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={headerA11y}
          accessibilityHint="Opens Readiness details"
          disabled={!canOpen}
          onPress={onOpenReadiness}
          style={({ pressed }) => [styles.headerPressable, pressed && canOpen && styles.headerPressed]}
        >
          <Text style={styles.title}>Oura Readiness</Text>
          {model?.sourceLabel ? (
            <Text style={styles.subtitle}>Source: {model.sourceLabel}</Text>
          ) : null}
          {model?.headlineValueText ? (
            <Text style={styles.headlineValue}>{model.headlineValueText}</Text>
          ) : null}
          {model?.ratingLabel ? <Text style={styles.rating}>{model.ratingLabel}</Text> : null}
          {loading ? <Text style={styles.mutedLine}>Loading daily readiness…</Text> : null}
          {error ? <Text style={styles.mutedLine}>Could not load daily readiness</Text> : null}
          {vm.status === "missing" ? (
            <>
              <Text style={styles.mutedLine}>{missingMessage}</Text>
              {missingCta ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={missingCta.label}
                  onPress={onOpenOuraReconnect}
                  style={styles.ctaPressable}
                >
                  <Text style={styles.ctaText}>{missingCta.label}</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
          {model?.summarySentence && model.hasAnySignal ? (
            <Text style={styles.summary}>{model.summarySentence}</Text>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginTop: 12,
  },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 12,
    padding: 15,
    backgroundColor: UI_CARD_SURFACE,
  },
  headerPressable: {
    gap: 4,
  },
  headerPressed: {
    opacity: 0.9,
  },
  title: strengthMetricCardTitleTextStyle,
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_MUTED,
    fontWeight: "500",
  },
  headlineValue: HEADLINE_VALUE_TEXT,
  rating: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    marginTop: 4,
  },
  mutedLine: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
    marginTop: 4,
  },
  ctaPressable: {
    marginTop: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
});
