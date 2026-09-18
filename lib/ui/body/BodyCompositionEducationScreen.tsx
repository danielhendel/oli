import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  BODY_COMPOSITION_EDUCATION_MODEL,
  deriveBodyCompositionStage3bReadiness,
} from "@/lib/body/education/bodyCompositionEducationModel";
import type { BodyCompositionStage3bReadiness } from "@/lib/body/education/bodyCompositionEducationTypes";
import { BodyCompositionBaselineSection } from "@/lib/ui/body/BodyCompositionBaselineSection";
import { BodyCompositionEvidenceTiers } from "@/lib/ui/body/BodyCompositionEvidenceTiers";
import { BodyCompositionInfluenceSection } from "@/lib/ui/body/BodyCompositionInfluenceSection";
import { BodyCompositionMarkerSection } from "@/lib/ui/body/BodyCompositionMarkerSection";
import { BodyCompositionMeasurementTrustCard } from "@/lib/ui/body/BodyCompositionMeasurementTrustCard";
import { BodyCompositionPlanBoundaryCard } from "@/lib/ui/body/BodyCompositionPlanBoundaryCard";
import { BodyCompositionReferenceModelCard } from "@/lib/ui/body/BodyCompositionReferenceModelCard";
import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type BodyCompositionEducationScreenProps = {
  /** Lightweight existing-measurement presence only — never a classification. */
  hasAnyExistingBodyMeasurement: boolean;
  appleHealthSlot: React.ReactNode;
  onPressAddWeight: () => void;
  onPressHref: (href: string) => void;
  onPressOpenPlan: () => void;
  /** Existing measurement UI rendered after education. */
  measurementsSlot: React.ReactNode;
};

/**
 * Pure educational shell composition. Does not mount domain data hooks.
 */
export function BodyCompositionEducationScreen(props: BodyCompositionEducationScreenProps) {
  const model = BODY_COMPOSITION_EDUCATION_MODEL;
  const readiness: BodyCompositionStage3bReadiness = deriveBodyCompositionStage3bReadiness({
    hasAnyExistingBodyMeasurement: props.hasAnyExistingBodyMeasurement,
  });
  const readinessTitle =
    readiness === "partial" ? model.readinessPartialTitle : model.readinessMissingTitle;
  const readinessBody =
    readiness === "partial" ? model.readinessPartialBody : model.readinessMissingBody;

  return (
    <View style={styles.root} testID="body-composition-education-screen">
      <View style={styles.purposeBlock}>
        <Text style={styles.purpose} accessibilityRole="header" testID="body-composition-purpose">
          {model.purpose}
        </Text>
      </View>

      <BodyCompositionReferenceModelCard
        educationalReferenceLabel={model.educationalReferenceLabel}
        independenceCopy={model.referenceIndependenceCopy}
        placementCopy={model.referencePlacementCopy}
        dimensions={model.dimensions}
      />

      <BodyCompositionMarkerSection title={model.markersSectionTitle} markers={model.markers} />

      <BodyCompositionEvidenceTiers title={model.evidenceSectionTitle} tiers={model.evidenceTiers} />

      <BodyCompositionBaselineSection
        title={model.baselineSectionTitle}
        intro={model.baselineIntro}
        readiness={readiness}
        readinessTitle={readinessTitle}
        readinessBody={readinessBody}
        waistTitle={model.waistEducationTitle}
        waistBody={model.waistEducationBody}
        dexaTitle={model.dexaEducationTitle}
        dexaBody={model.dexaEducationBody}
        actions={model.baselineActions}
        appleHealthSlot={props.appleHealthSlot}
        onPressAddWeight={props.onPressAddWeight}
        onPressHref={props.onPressHref}
      />

      <BodyCompositionMeasurementTrustCard
        title={model.measurementTrustTitle}
        points={model.measurementTrustPoints}
        onPressLearnMore={() => props.onPressHref(model.measurementTrustLearnMoreHref)}
      />

      <View style={styles.measurementsBlock} testID="body-composition-measurements-section">
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {model.measurementsSectionTitle}
        </Text>
        <Text style={styles.sectionNote}>{model.measurementsSectionNote}</Text>
        {props.measurementsSlot}
      </View>

      <BodyCompositionInfluenceSection
        title={model.influencesSectionTitle}
        intro={model.influencesIntro}
        influences={model.influences}
        onPressHref={props.onPressHref}
      />

      <BodyCompositionPlanBoundaryCard
        title={model.planBoundaryTitle}
        body={model.planBoundaryBody}
        actionLabel={model.planActionLabel}
        onPressOpenPlan={props.onPressOpenPlan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 20,
  },
  purposeBlock: {
    gap: 4,
  },
  purpose: {
    color: UI_TEXT_SECONDARY,
    fontSize: 16,
    lineHeight: 22,
  },
  measurementsBlock: {
    gap: 12,
  },
  sectionTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionNote: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
});
