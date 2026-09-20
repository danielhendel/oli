import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BodyMetricCardModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import type {
  BodyFatPrimaryView,
  LeanMassPrimaryView,
  WeightPrimaryView,
} from "@/lib/body/presentation/bodyMetricPrimaryViews";
import {
  BodyMetricSummaryCard,
  type BodyMassDisplayUnit,
  type BodyMetricConnectionActionKind,
} from "@/lib/ui/body/BodyMetricSummaryCard";
import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

export type BodyCompositionConnectionAction = {
  kind: BodyMetricConnectionActionKind;
  label: string;
};

export type BodyCompositionSummaryScreenProps = {
  cards: readonly BodyMetricCardModel[];
  connectionActionForMetric?: (
    metric: BodyMetricCardModel["metric"],
  ) => BodyCompositionConnectionAction;
  /** @deprecated Prefer connectionActionForMetric. */
  connectionAction?: BodyCompositionConnectionAction;
  onPressCard: (href: string) => void;
  onPressAddWeight: () => void;
  onPressConnectionAction?: () => void;
  onPressConnectionActionForMetric?: (metric: BodyMetricCardModel["metric"]) => void;
  /** User mass-unit preference — display only; toggles do not mutate it. */
  massDisplayUnit: BodyMassDisplayUnit;
  weightPrimaryView: WeightPrimaryView;
  onChangeWeightPrimaryView: (view: WeightPrimaryView) => void;
  bodyFatPrimaryView: BodyFatPrimaryView;
  onChangeBodyFatPrimaryView: (view: BodyFatPrimaryView) => void;
  leanMassPrimaryView: LeanMassPrimaryView;
  onChangeLeanMassPrimaryView: (view: LeanMassPrimaryView) => void;
  measurementErrorSlot?: React.ReactNode;
  /** Bottom scroll clearance above floating navigation. */
  bottomClearance?: number;
};

function SectionHeading(props: { title: string; testID: string }) {
  return (
    <Text
      accessibilityRole="header"
      style={styles.sectionHeading}
      testID={props.testID}
    >
      {props.title}
    </Text>
  );
}

function renderCard(
  card: BodyMetricCardModel,
  props: BodyCompositionSummaryScreenProps,
) {
  const connectionAction =
    props.connectionActionForMetric?.(card.metric) ??
    props.connectionAction ?? { kind: "sync_now" as const, label: "Sync now" };
  return (
    <BodyMetricSummaryCard
      key={card.metric}
      model={card}
      onPress={() => props.onPressCard(card.detailHref)}
      onPressAddMeasurement={props.onPressAddWeight}
      connectionAction={connectionAction}
      onPressConnectionAction={() => {
        if (props.onPressConnectionActionForMetric) {
          props.onPressConnectionActionForMetric(card.metric);
          return;
        }
        props.onPressConnectionAction?.();
      }}
      massDisplayUnit={props.massDisplayUnit}
      weightPrimaryView={props.weightPrimaryView}
      onChangeWeightPrimaryView={props.onChangeWeightPrimaryView}
      bodyFatPrimaryView={props.bodyFatPrimaryView}
      onChangeBodyFatPrimaryView={props.onChangeBodyFatPrimaryView}
      leanMassPrimaryView={props.leanMassPrimaryView}
      onChangeLeanMassPrimaryView={props.onChangeLeanMassPrimaryView}
    />
  );
}

/**
 * Stage 3C landing: Total Mass (Weight) → Components (Body Fat, Lean Mass).
 * No calendar/list chrome — those live on metric detail headers.
 */
export function BodyCompositionSummaryScreen(props: BodyCompositionSummaryScreenProps) {
  const bottomClearance = props.bottomClearance ?? 28;
  const weight = props.cards.find((c) => c.metric === "weight");
  const bodyFat = props.cards.find((c) => c.metric === "bodyFat");
  const leanTissue = props.cards.find((c) => c.metric === "leanTissue");

  return (
    <View style={styles.root} testID="body-composition-summary-screen">
      {props.measurementErrorSlot}

      <View style={styles.sections} testID="body-composition-metric-cards">
        <View style={styles.section} testID="body-composition-total-mass-section">
          <SectionHeading title="Total Mass" testID="body-composition-heading-total-mass" />
          {weight != null ? renderCard(weight, props) : null}
        </View>

        <View style={styles.section} testID="body-composition-components-section">
          <SectionHeading title="Components" testID="body-composition-heading-components" />
          {bodyFat != null ? renderCard(bodyFat, props) : null}
          {leanTissue != null ? renderCard(leanTissue, props) : null}
        </View>
      </View>

      <View
        style={{ height: bottomClearance }}
        testID="body-composition-bottom-clearance"
        accessibilityElementsHidden
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 20,
  },
  sections: {
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    color: UI_TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
    paddingHorizontal: 2,
  },
});
