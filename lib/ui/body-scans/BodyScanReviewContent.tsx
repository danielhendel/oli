// lib/ui/body-scans/BodyScanReviewContent.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import type { BodyScanReviewFieldDto, BodyScanReviewResponseDto } from "@/lib/contracts";
import {
  buildBodyScanPresentationGroupsFromReviewFields,
  type BodyScanPresentationItem,
} from "@/lib/data/body-scans/buildBodyScanPresentationGroups";
import { bodyScanUnitSuffix } from "@/lib/data/body-scans/bodyScanMetricCatalog";
import {
  buildReviewSubmission,
  formatReviewReportShows,
  initialReviewInputState,
  parseReviewFieldValue,
  reviewFieldErrorMessage,
  type BodyScanReviewInputState,
} from "@/lib/data/body-scans/reviewFieldInput";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type BodyScanReviewContentProps = {
  status: "partial" | "error" | "not_found" | "ready";
  error?: string;
  requestId?: string | null;
  review?: BodyScanReviewResponseDto;
  submitting?: boolean;
  submitErrorMessage?: string | null;
  onRetry?: () => void;
  onConfirm: (submission: {
    corrections: { fieldId: string; value: number | null }[];
    acknowledgedFieldIds: string[];
  }) => void;
};

const BLOCKED_MESSAGE =
  "Check the highlighted values against your report, then save. Clear a field if your report does not show it.";

function ReviewField({
  field,
  label,
  input,
  onChangeText,
  onToggleAcknowledged,
}: {
  field: BodyScanReviewFieldDto;
  /** Registry-driven canonical label (not parser raw label). */
  label: string;
  input: { text: string; acknowledged: boolean };
  onChangeText: (text: string) => void;
  onToggleAcknowledged: (next: boolean) => void;
}) {
  const parsed = parseReviewFieldValue(input.text);
  const unitSuffix = bodyScanUnitSuffix(field.unit);
  return (
    <View style={styles.field} testID={`body-scan-review-field-${field.fieldId}`}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldRaw}>Report shows: {formatReviewReportShows(field)}</Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={input.text}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="Not in my report"
          placeholderTextColor={UI_TEXT_TERTIARY_LABEL}
          accessibilityLabel={`${label} value`}
          style={styles.input}
          testID={`body-scan-review-input-${field.fieldId}`}
        />
        {unitSuffix ? <Text style={styles.unit}>{unitSuffix.trim()}</Text> : null}
      </View>

      {!parsed.ok ? (
        <Text style={styles.fieldError} testID={`body-scan-review-error-${field.fieldId}`}>
          {reviewFieldErrorMessage(parsed.reason)}
        </Text>
      ) : null}
      {parsed.ok && parsed.value == null ? (
        <Text style={styles.fieldHint}>Saved as not measured, not as zero.</Text>
      ) : null}

      {field.requiresReview ? (
        <View style={styles.ackRow}>
          <Switch
            value={input.acknowledged}
            onValueChange={onToggleAcknowledged}
            accessibilityLabel={`I checked ${label}`}
            testID={`body-scan-review-ack-${field.fieldId}`}
          />
          <Text style={styles.ackLabel}>I checked this against my report</Text>
        </View>
      ) : null}
    </View>
  );
}

function ReviewItem({
  item,
  field,
  input,
  divided,
  onChangeText,
  onToggleAcknowledged,
}: {
  item: BodyScanPresentationItem;
  field: BodyScanReviewFieldDto;
  input: { text: string; acknowledged: boolean };
  divided: boolean;
  onChangeText: (text: string) => void;
  onToggleAcknowledged: (next: boolean) => void;
}) {
  return (
    <View style={divided ? styles.fieldDivided : undefined}>
      <ReviewField
        field={field}
        label={item.label}
        input={input}
        onChangeText={onChangeText}
        onToggleAcknowledged={onToggleAcknowledged}
      />
    </View>
  );
}

export function BodyScanReviewContent({
  status,
  error,
  requestId,
  review,
  submitting = false,
  submitErrorMessage,
  onRetry,
  onConfirm,
}: BodyScanReviewContentProps) {
  const fields = useMemo(() => review?.fields ?? [], [review]);
  const fieldById = useMemo(() => {
    const map = new Map<string, BodyScanReviewFieldDto>();
    for (const field of fields) map.set(field.fieldId, field);
    return map;
  }, [fields]);

  const groups = useMemo(
    () => buildBodyScanPresentationGroupsFromReviewFields(fields),
    [fields],
  );

  const [inputs, setInputs] = useState<BodyScanReviewInputState>(() =>
    initialReviewInputState(fields),
  );
  const [showBlockers, setShowBlockers] = useState(false);

  useEffect(() => {
    setInputs(initialReviewInputState(fields));
    setShowBlockers(false);
  }, [fields]);

  const submission = useMemo(() => buildReviewSubmission(fields, inputs), [fields, inputs]);

  const handleConfirm = useCallback(() => {
    if (!submission.ok) {
      setShowBlockers(true);
      return;
    }
    onConfirm({
      corrections: submission.corrections,
      acknowledgedFieldIds: submission.acknowledgedFieldIds,
    });
  }, [onConfirm, submission]);

  if (status === "partial") return <LoadingState message="Loading review…" />;
  if (status === "not_found") {
    return (
      <EmptyState
        title="Scan not available"
        description="This scan is no longer stored in your account."
        testID="body-scan-review-not-found"
      />
    );
  }
  if (status === "error" || !review) {
    return (
      <ErrorState
        message={error ?? "Could not load this review"}
        requestId={requestId ?? null}
        {...(onRetry ? { onRetry } : {})}
      />
    );
  }

  if (review.manualReviewOnly) {
    return (
      <View style={styles.root} testID="body-scan-review-manual-only">
        <EmptyState
          title="This report needs a manual look"
          description="We could not read measurements from this file, so nothing has been recorded. Your original report is still stored and you can open it any time."
          testID="body-scan-review-manual-empty"
        />
        {review.safeWarnings.map((warning) => (
          <Text key={warning} style={styles.warning}>
            {warning}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.root} testID="body-scan-review">
      <Text style={styles.intro}>
        These values were read from your report. Check them, correct anything that differs, then
        save.
      </Text>
      {review.safeWarnings.map((warning) => (
        <Text key={warning} style={styles.warning} testID="body-scan-review-warning">
          {warning}
        </Text>
      ))}

      {groups.map((group) => (
        <View
          key={group.sectionId}
          style={styles.section}
          testID={`body-scan-review-section-${group.sectionId}`}
        >
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {group.title}
          </Text>
          {group.note ? <Text style={styles.sectionNote}>{group.note}</Text> : null}

          {group.regionBlocks.map((block) => (
            <View
              key={`${group.sectionId}:${block.region}`}
              style={styles.regionBlock}
              testID={`body-scan-review-region-${block.region}`}
            >
              <Text accessibilityRole="header" style={styles.regionTitle}>
                {block.title}
              </Text>
              <View style={styles.card}>
                {block.items.map((item, index) => {
                  const fieldId = item.fieldId;
                  if (!fieldId) return null;
                  const field = fieldById.get(fieldId);
                  if (!field) return null;
                  return (
                    <ReviewItem
                      key={item.key}
                      item={item}
                      field={field}
                      input={inputs[field.fieldId] ?? { text: "", acknowledged: false }}
                      divided={index > 0}
                      onChangeText={(text) =>
                        setInputs((prev) => ({
                          ...prev,
                          [field.fieldId]: {
                            text,
                            acknowledged: prev[field.fieldId]?.acknowledged ?? false,
                          },
                        }))
                      }
                      onToggleAcknowledged={(next) =>
                        setInputs((prev) => ({
                          ...prev,
                          [field.fieldId]: {
                            text: prev[field.fieldId]?.text ?? "",
                            acknowledged: next,
                          },
                        }))
                      }
                    />
                  );
                })}
              </View>
            </View>
          ))}

          {group.items.length > 0 ? (
            <View style={styles.card}>
              {group.items.map((item, index) => {
                const fieldId = item.fieldId;
                if (!fieldId) return null;
                const field = fieldById.get(fieldId);
                if (!field) return null;
                return (
                  <ReviewItem
                    key={item.key}
                    item={item}
                    field={field}
                    input={inputs[field.fieldId] ?? { text: "", acknowledged: false }}
                    divided={index > 0}
                    onChangeText={(text) =>
                      setInputs((prev) => ({
                        ...prev,
                        [field.fieldId]: {
                          text,
                          acknowledged: prev[field.fieldId]?.acknowledged ?? false,
                        },
                      }))
                    }
                    onToggleAcknowledged={(next) =>
                      setInputs((prev) => ({
                        ...prev,
                        [field.fieldId]: {
                          text: prev[field.fieldId]?.text ?? "",
                          acknowledged: next,
                        },
                      }))
                    }
                  />
                );
              })}
            </View>
          ) : null}
        </View>
      ))}

      {showBlockers && !submission.ok ? (
        <Text style={styles.blockedMessage} testID="body-scan-review-blocked">
          {BLOCKED_MESSAGE}
        </Text>
      ) : null}
      {submitErrorMessage ? (
        <Text style={styles.blockedMessage} testID="body-scan-review-submit-error">
          {submitErrorMessage}
        </Text>
      ) : null}

      <Pressable
        onPress={handleConfirm}
        disabled={submitting || !review.confirmAvailable}
        accessibilityRole="button"
        accessibilityLabel="Save these measurements"
        accessibilityState={{ disabled: submitting || !review.confirmAvailable }}
        style={({ pressed }) => [
          styles.confirm,
          pressed && styles.confirmPressed,
          (submitting || !review.confirmAvailable) && styles.confirmDisabled,
        ]}
        testID="body-scan-review-confirm"
      >
        <Text style={styles.confirmLabel}>
          {submitting ? "Saving…" : "Save these measurements"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16, paddingBottom: 32 },
  intro: { color: UI_TEXT_SECONDARY, fontSize: 14 },
  warning: { color: UI_TEXT_SECONDARY, fontSize: 13 },
  section: { gap: 8 },
  sectionTitle: { color: UI_TEXT_PRIMARY, fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },
  sectionNote: { color: UI_TEXT_SECONDARY, fontSize: 13 },
  regionBlock: { gap: 6 },
  regionTitle: { color: UI_TEXT_SECONDARY, fontSize: 14, fontWeight: "600" },
  card: { ...elevatedCardSurfaceStyle, paddingHorizontal: 16 },
  field: { gap: 8, paddingVertical: 14 },
  fieldDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: UI_BORDER_HAIRLINE },
  fieldHeader: { gap: 2 },
  fieldLabel: { color: UI_TEXT_PRIMARY, fontSize: 15, fontWeight: "600" },
  fieldRaw: { color: UI_TEXT_TERTIARY_LABEL, fontSize: 12 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    borderRadius: 10,
  },
  unit: { color: UI_TEXT_SECONDARY, fontSize: 14 },
  fieldError: { color: UI_TEXT_PRIMARY, fontSize: 12 },
  fieldHint: { color: UI_TEXT_TERTIARY_LABEL, fontSize: 12 },
  ackRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ackLabel: { color: UI_TEXT_SECONDARY, fontSize: 13, flex: 1 },
  blockedMessage: { color: UI_TEXT_PRIMARY, fontSize: 14 },
  confirm: {
    ...elevatedCardSurfaceStyle,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmPressed: { opacity: 0.85 },
  confirmDisabled: { opacity: 0.5 },
  confirmLabel: { color: UI_TEXT_PRIMARY, fontSize: 15, fontWeight: "600" },
});
