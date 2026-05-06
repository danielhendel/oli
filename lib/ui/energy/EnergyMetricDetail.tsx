/**
 * Shared Daily Energy metric explainer — reads facts from hooks (no kcal math).
 */

import React from "react";
import { ScrollView, Text, View } from "react-native";

import type { DailyEnergyCardDto, DailyEnergyFactorDto } from "@/lib/data/dash/useDailyEnergyCard";
import { useDailyEnergyCard } from "@/lib/data/dash/useDailyEnergyCard";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import type { DailyFactsDto } from "@/lib/contracts";
import { rangeExplainerSheetStyles as styles } from "@/lib/ui/workouts/rangeExplainerSheetStyles";
import {
  buildBmrPersonalizedParagraph,
  buildCardioPersonalizedParagraph,
  buildImproveAccuracyTip,
  buildNeatPersonalizedParagraph,
  buildStrengthPersonalizedParagraph,
  bmrAccuracyNote,
  getFactorInputsUsedLabels,
  getFactorMissingInputLabels,
} from "@/lib/ui/energy/energyPresentation";

export type EnergyMetricVariant = "bmr" | "neat" | "cardio" | "strength";

const TITLES: Record<EnergyMetricVariant, { title: string; subtitle: string }> = {
  bmr: { title: "BMR", subtitle: "Your baseline energy burn" },
  neat: { title: "NEAT", subtitle: "Movement outside planned exercise" },
  cardio: { title: "Cardio", subtitle: "Planned cardio sessions" },
  strength: { title: "Strength", subtitle: "Resistance training" },
};

function pickFactor(
  variant: EnergyMetricVariant,
  factors: DailyEnergyCardDto["factors"],
): DailyEnergyFactorDto | undefined {
  switch (variant) {
    case "bmr":
      return factors.baseline;
    case "neat":
      return factors.steps;
    case "cardio":
      return factors.cardio;
    case "strength":
      return factors.strength;
  }
}

function SectionHeading({ children }: { children: string }): React.ReactElement {
  return <Text style={styles.sectionHeading}>{children}</Text>;
}

export type EnergyMetricDetailProps = {
  dayKey: string;
  variant: EnergyMetricVariant;
};

export function EnergyMetricDetail({ dayKey, variant }: EnergyMetricDetailProps): React.ReactElement {
  const { energy, loading, error } = useDailyEnergyCard(dayKey);
  const facts = useDailyFacts(dayKey);
  const factsData = facts.status === "ready" ? (facts.data as DailyFactsDto) : undefined;

  const meta = TITLES[variant];
  const factor = energy ? pickFactor(variant, energy.factors) : undefined;
  const influencers = factsData?.energyInfluencers;

  const cardioDuration =
    variant === "cardio" && factsData?.cardio?.durationMinutes != null
      ? factsData.cardio.durationMinutes
      : undefined;

  let personalized = "";
  if (factor) {
    if (variant === "bmr") personalized = buildBmrPersonalizedParagraph(factor);
    else if (variant === "neat") personalized = buildNeatPersonalizedParagraph(factor);
    else if (variant === "cardio") {
      const cardioOpts =
        typeof cardioDuration === "number" && cardioDuration > 0 ? { durationMinutes: cardioDuration } : {};
      personalized = buildCardioPersonalizedParagraph(factor, cardioOpts);
    } else personalized = buildStrengthPersonalizedParagraph(factor);
  }

  const inputsUsed = factor?.inputsUsed ? getFactorInputsUsedLabels(factor.inputsUsed) : [];
  const inputsMissing = factor?.inputsMissing ? getFactorMissingInputLabels(factor.inputsMissing) : [];
  const rangeText =
    factor && typeof factor.kcalLow === "number" && typeof factor.kcalHigh === "number"
      ? `+${Math.round(factor.kcalLow).toLocaleString()}\u2013${Math.round(factor.kcalHigh).toLocaleString()} kcal`
      : null;
  const accuracyWins: string[] = [];
  const missingSignals: string[] = [];
  const domainMetrics: string[] = [];
  if (variant === "neat") {
    const steps = influencers?.movement?.steps ?? factsData?.activity?.steps;
    const distanceM = influencers?.movement?.distanceMeters;
    const bodyWeightKnown = factor?.inputsUsed?.some((k) => k.includes("body.weightKg"));
    if (typeof steps === "number") domainMetrics.push(`${Math.round(steps).toLocaleString()} steps`);
    if (typeof distanceM === "number" && distanceM > 0) {
      domainMetrics.push(`${(distanceM / 1000).toFixed(2)} km distance`);
      accuracyWins.push("Distance was used, which improves accuracy vs steps-only.");
    } else {
      missingSignals.push("Walking/running distance for today");
    }
    if (bodyWeightKnown) domainMetrics.push("Body weight");
    else missingSignals.push("Body weight");
  } else if (variant === "cardio") {
    const dur = influencers?.cardio?.durationMinutes ?? factsData?.cardio?.durationMinutes;
    const dist = influencers?.cardio?.distanceMeters ?? factsData?.cardio?.distanceMeters;
    const sport = influencers?.cardio?.sport ?? factsData?.cardio?.primarySport;
    if (typeof dur === "number" && dur > 0) domainMetrics.push(`${Math.round(dur)} min`);
    if (typeof dist === "number" && dist > 0) domainMetrics.push(`${(dist / 1609.344).toFixed(2)} mi`);
    if (typeof sport === "string") domainMetrics.push(sport);
    if (typeof influencers?.cardio?.paceMinPerKm === "number" && influencers.cardio.paceMinPerKm > 0) {
      domainMetrics.push(`${influencers.cardio.paceMinPerKm.toFixed(2)} min/km pace`);
    }
    const hasHr = typeof influencers?.cardio?.averageHeartRateBpm === "number";
    if (hasHr) {
      domainMetrics.push(`Avg HR ${Math.round(influencers?.cardio?.averageHeartRateBpm ?? 0)} bpm`);
      accuracyWins.push("Heart rate was available and can tighten intensity calibration.");
    } else {
      missingSignals.push("Workout average heart rate");
    }
    if (typeof influencers?.cardio?.maxHeartRateBpm === "number") {
      domainMetrics.push(`Max HR ${Math.round(influencers.cardio.maxHeartRateBpm)} bpm`);
    } else {
      missingSignals.push("Workout max heart rate");
    }
    if (!(typeof dist === "number" && dist > 0)) {
      missingSignals.push("Workout distance");
    }
  } else if (variant === "strength") {
    const s = influencers?.strength;
    const sport = s?.sport ?? factsData?.strength?.primarySport;
    if (typeof sport === "string") domainMetrics.push(sport);
    if (typeof s?.volumeKg === "number") domainMetrics.push(`${Math.round(s.volumeKg).toLocaleString()} kg volume`);
    if (typeof s?.durationMinutes === "number") domainMetrics.push(`${Math.round(s.durationMinutes)} min`);
    if (typeof s?.sets === "number") domainMetrics.push(`${Math.round(s.sets)} sets`);
    if (typeof s?.reps === "number") domainMetrics.push(`${Math.round(s.reps)} reps`);
    if (typeof s?.densityKgPerMinute === "number")
      domainMetrics.push(`${s.densityKgPerMinute.toFixed(1)} kg/min density`);
    if (typeof s?.densityKgPerMinute === "number") accuracyWins.push("Session density was available and improves precision.");
    else missingSignals.push("Strength session duration for density");
    if (typeof s?.averageHeartRateBpm === "number") {
      domainMetrics.push(`Avg HR ${Math.round(s.averageHeartRateBpm)} bpm`);
      accuracyWins.push("Heart rate was available for this strength session.");
    }
    if (typeof s?.maxHeartRateBpm === "number") {
      domainMetrics.push(`Max HR ${Math.round(s.maxHeartRateBpm)} bpm`);
    }
    if (typeof s?.averageHeartRateBpm !== "number") {
      missingSignals.push("In-workout heart rate / rest-time detail");
    }
  } else if (variant === "bmr") {
    const leanMass = factor?.inputsUsed?.some((k) => k === "body.leanBodyMassKg" || k === "body.bodyFatPercent");
    if (leanMass) accuracyWins.push("Lean-mass signal was used, tightening the baseline range.");
    else missingSignals.push("Lean body mass or body fat %");
    if (!factor?.inputsUsed?.some((k) => k === "profile.dateOfBirth")) missingSignals.push("Date of birth (age)");
    if (!factor?.inputsUsed?.some((k) => k === "profile.heightCm")) missingSignals.push("Height");
    if (!factor?.inputsUsed?.some((k) => k === "profile.sexAtBirth")) missingSignals.push("Sex at birth");
  }
  const accuracyNote = variant === "bmr" && factor ? bmrAccuracyNote(factor) : null;
  const improveTip =
    factor && energy
      ? buildImproveAccuracyTip({
          metric:
            variant === "bmr"
              ? "baseline"
              : variant === "neat"
                ? "steps"
                : variant === "cardio"
                  ? "cardio"
                  : "strength",
          factor,
          energyMissingRequired: energy.missingRequiredInputs,
        })
      : null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      testID={`energy-detail-${variant}-scroll`}
    >
      <Text style={styles.lead}>{meta.subtitle}</Text>

      {loading ? <Text style={styles.tierBody}>Loading\u2026</Text> : null}
      {!loading && error ? (
        <Text style={styles.tierBody}>Could not load daily energy for this day.</Text>
      ) : null}
      {!loading && !error && !energy ? (
        <Text style={styles.tierBody}>Not enough data yet to show this metric.</Text>
      ) : null}
      {!loading && !error && energy && !factor ? (
        <Text style={styles.tierBody}>This estimate is not available for today.</Text>
      ) : null}

      {!loading && !error && factor ? (
        <>
          {rangeText ? <Text style={styles.personalLine}>{rangeText}</Text> : null}
          <View style={styles.personalCard} accessibilityLabel={`${meta.title} personalized estimate`}>
            <Text style={styles.personalHeading}>Personalized</Text>
            <Text style={styles.personalLine}>{personalized}</Text>
          </View>
          {domainMetrics.length > 0 ? (
            <>
              <SectionHeading>What improved accuracy today</SectionHeading>
              {domainMetrics.map((line) => (
                <Text key={line} style={styles.tierBody}>
                  {"\u2022 "}
                  {line}
                </Text>
              ))}
            </>
          ) : null}
          {accuracyWins.length > 0 ? (
            <>
              {accuracyWins.map((line) => (
                <Text key={line} style={styles.tierBody}>
                  {line}
                </Text>
              ))}
            </>
          ) : null}

          {accuracyNote ? (
            <View style={styles.personalCard}>
              <Text style={styles.personalHeading}>Accuracy note</Text>
              <Text style={styles.tierBody}>{accuracyNote}</Text>
            </View>
          ) : null}

          <SectionHeading>Inputs used</SectionHeading>
          {inputsUsed.length > 0 ? (
            inputsUsed.map((line) => (
              <Text key={line} style={styles.tierBody}>
                {"\u2022 "}
                {line}
              </Text>
            ))
          ) : (
            <Text style={styles.tierBody}>No input labels available for this estimate.</Text>
          )}

          {inputsMissing.length > 0 ? (
            <>
              <SectionHeading>Missing inputs</SectionHeading>
              {inputsMissing.map((line) => (
                <Text key={line} style={styles.tierBody}>
                  {"\u2022 "}
                  {line}
                </Text>
              ))}
            </>
          ) : null}
          {missingSignals.length > 0 ? (
            <>
              <SectionHeading>Missing signals that would improve this</SectionHeading>
              {missingSignals.map((line) => (
                <Text key={line} style={styles.tierBody}>
                  {"\u2022 "}
                  {line}
                </Text>
              ))}
            </>
          ) : null}

          {improveTip ? (
            <>
              <SectionHeading>How to improve accuracy</SectionHeading>
              <Text style={styles.tierBody}>{improveTip}</Text>
            </>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}
