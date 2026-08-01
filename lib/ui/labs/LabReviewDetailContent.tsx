// lib/ui/labs/LabReviewDetailContent.tsx
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { countReviewActionStatuses } from "@/lib/data/labs/applyLabReviewCandidateStatus";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  LAB_REVIEW_GROUP_LABELS,
  LAB_REVIEW_STATUS_LABELS,
  candidateDisplayName,
  candidateResultText,
  fastingLabel,
  formatReviewDate,
  reportReviewStatusLabel,
  reviewSummaryCountsLabel,
} from "@/lib/ui/labs/labReviewPresentation";
import {
  UI_SCREEN_BG,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import type { LabReportMetadataCandidate, LabReviewCandidateDto, LabReviewDetailDto } from "@/lib/contracts";

export type LabReviewDetailContentProps = {
  status: "partial" | "error" | "ready";
  error?: string;
  requestId?: string | null;
  data?: LabReviewDetailDto;
  onRetry?: () => void;
  actionBusy?: boolean;
  /** Candidate currently being mutated — shows Saving on that row. */
  savingCandidateId?: string | null;
  /** When true, omit footer (screen renders sticky footer outside ScrollView). */
  hideFooter?: boolean;
  onAcceptCandidate: (candidateId: string) => void;
  onEditCandidate: (candidateId: string, correction: { rawFlag?: string | null; resultValueText?: string }) => void;
  onRejectCandidate: (candidateId: string) => void;
  onSaveProgress: () => void;
  onFinishReview: () => void;
};

type CandidateGroupKey = "matched" | "needs_review" | "unmatched";

function groupCandidates(candidates: LabReviewCandidateDto[], group: CandidateGroupKey): LabReviewCandidateDto[] {
  return candidates.filter((c) => c.matchGroup === group);
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function ReportMetadataSection({ metadata }: { metadata: LabReportMetadataCandidate }) {
  const collected = formatReviewDate(metadata.collectedAt);
  const received = formatReviewDate(metadata.receivedAt);
  const reported = formatReviewDate(metadata.reportedAt);
  const fasting = fastingLabel(metadata.fasting);
  const panels = metadata.panelNames?.length ? metadata.panelNames.join(", ") : null;
  const labs =
    metadata.performingLaboratories
      ?.map((l) => l.name ?? l.code)
      .filter(Boolean)
      .join(", ") ?? null;

  return (
    <View style={styles.card} testID="lab-review-metadata">
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Report metadata
      </Text>
      <MetadataRow label="Laboratory" value={metadata.laboratoryName ?? labs ?? ""} />
      <MetadataRow label="Collected" value={collected ?? ""} />
      <MetadataRow label="Received" value={received ?? ""} />
      <MetadataRow label="Reported" value={reported ?? ""} />
      <MetadataRow label="Fasting" value={fasting ?? ""} />
      <MetadataRow label="Specimen" value={metadata.specimenType ?? ""} />
      <MetadataRow label="Panels" value={panels ?? ""} />
      {metadata.pageCount != null ? (
        <MetadataRow label="Pages" value={String(metadata.pageCount)} />
      ) : null}
    </View>
  );
}

function CandidateRow({
  candidate,
  disabled,
  saving,
  onAccept,
  onEdit,
  onReject,
}: {
  candidate: LabReviewCandidateDto;
  disabled?: boolean;
  saving?: boolean;
  onAccept: () => void;
  onEdit: () => void;
  onReject: () => void;
}) {
  const name = candidateDisplayName(candidate);
  const resultText = candidateResultText(candidate);
  const statusLabel = LAB_REVIEW_STATUS_LABELS[candidate.reviewStatus];
  const flagText = candidate.flagLabel?.trim() || "—";
  const rangeText = candidate.rawReferenceRange?.trim() || "—";
  const unitText = candidate.unit?.trim() || "—";
  const rowDisabled = disabled === true || saving === true;

  return (
    <View style={styles.candidateRow} testID={`lab-review-candidate-${candidate.id}`}>
      <View style={styles.candidateMain}>
        <Text style={styles.candidateName} accessibilityRole="header">
          {name}
        </Text>
        {name !== candidate.rawAnalyteLabel ? (
          <Text style={styles.rawLabel}>Report label: {candidate.rawAnalyteLabel}</Text>
        ) : null}
        <View style={styles.valueGrid}>
          <Text style={styles.valueCell}>
            Result: <Text style={styles.valueStrong}>{resultText}</Text>
          </Text>
          <Text style={styles.valueCell}>
            Unit: <Text style={styles.valueStrong}>{unitText}</Text>
          </Text>
          <Text style={styles.valueCell}>
            Flag: <Text style={styles.valueStrong}>{flagText}</Text>
          </Text>
          <Text style={styles.valueCell}>
            Range: <Text style={styles.valueStrong}>{rangeText}</Text>
          </Text>
          <Text style={styles.valueCell}>
            Page: <Text style={styles.valueStrong}>{candidate.sourcePage}</Text>
          </Text>
        </View>
        {candidate.panelName ? (
          <Text style={styles.panelName}>Panel: {candidate.panelName}</Text>
        ) : null}
        {candidate.warnings.length > 0 ? (
          <Text style={styles.warningText} testID={`lab-review-candidate-warnings-${candidate.id}`}>
            {candidate.warnings.join(" ")}
          </Text>
        ) : null}
        <Text
          style={styles.reviewStatus}
          accessibilityLabel={`Review status: ${saving ? "Saving" : statusLabel}`}
          testID={`lab-review-candidate-status-${candidate.id}`}
        >
          Status: {saving ? "Saving…" : statusLabel}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={onAccept}
          disabled={rowDisabled || candidate.reviewStatus === "accepted"}
          accessibilityRole="button"
          accessibilityLabel={saving ? `Saving ${name}` : `Accept ${name}`}
          accessibilityState={{
            disabled: rowDisabled || candidate.reviewStatus === "accepted",
            busy: saving === true,
          }}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.acceptBtn,
            (rowDisabled || candidate.reviewStatus === "accepted") && styles.actionDisabled,
            pressed && !rowDisabled && styles.actionPressed,
          ]}
          testID={`lab-review-accept-${candidate.id}`}
        >
          {saving ? (
            <ActivityIndicator color="#86EFAC" testID={`lab-review-accept-saving-${candidate.id}`} />
          ) : (
            <Text style={styles.acceptLabel}>
              {candidate.reviewStatus === "accepted" ? "Accepted" : "Accept"}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={onEdit}
          disabled={rowDisabled}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${name}`}
          accessibilityState={{ disabled: rowDisabled }}
          style={({ pressed }) => [
            styles.actionBtn,
            rowDisabled && styles.actionDisabled,
            pressed && !rowDisabled && styles.actionPressed,
          ]}
          testID={`lab-review-edit-${candidate.id}`}
        >
          <Text style={styles.actionLabel}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={onReject}
          disabled={rowDisabled || candidate.reviewStatus === "rejected"}
          accessibilityRole="button"
          accessibilityLabel={`Reject ${name}`}
          accessibilityState={{ disabled: rowDisabled || candidate.reviewStatus === "rejected" }}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.rejectBtn,
            (rowDisabled || candidate.reviewStatus === "rejected") && styles.actionDisabled,
            pressed && !rowDisabled && styles.actionPressed,
          ]}
          testID={`lab-review-reject-${candidate.id}`}
        >
          <Text style={styles.rejectLabel}>
            {candidate.reviewStatus === "rejected" ? "Rejected" : "Reject"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function CandidateGroupSection({
  title,
  candidates,
  testId,
  disabled,
  savingCandidateId,
  onAcceptCandidate,
  onEditCandidate,
  onRejectCandidate,
}: {
  title: string;
  candidates: LabReviewCandidateDto[];
  testId: string;
  disabled?: boolean;
  savingCandidateId?: string | null;
  onAcceptCandidate: (candidateId: string) => void;
  onEditCandidate: (candidateId: string) => void;
  onRejectCandidate: (candidateId: string) => void;
}) {
  if (candidates.length === 0) return null;
  return (
    <View style={styles.card} testID={testId}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.groupHint}>
        {candidates.length} result{candidates.length === 1 ? "" : "s"}
      </Text>
      {candidates.map((candidate) => (
        <CandidateRow
          key={candidate.id}
          candidate={candidate}
          disabled={disabled === true}
          saving={savingCandidateId === candidate.id}
          onAccept={() => onAcceptCandidate(candidate.id)}
          onEdit={() => onEditCandidate(candidate.id)}
          onReject={() => onRejectCandidate(candidate.id)}
        />
      ))}
    </View>
  );
}

export function LabReviewActionsFooter({
  actionBusy,
  acceptedCount,
  rejectedCount,
  unresolvedCount,
  onSaveProgress,
  onFinishReview,
}: {
  actionBusy?: boolean;
  acceptedCount: number;
  rejectedCount: number;
  unresolvedCount: number;
  onSaveProgress: () => void;
  onFinishReview: () => void;
}) {
  const finishDisabled = actionBusy === true || acceptedCount === 0;
  return (
    <View style={styles.footer} testID="lab-review-footer">
      <Text style={styles.footerHint} testID="lab-review-action-copy">
        Accepting a result marks it for inclusion. Finish review adds accepted results to your Labs history.
      </Text>
      <Text style={styles.footerCounts} testID="lab-review-action-counts">
        {acceptedCount} accepted · {rejectedCount} rejected · {unresolvedCount} unresolved
      </Text>
      <Pressable
        onPress={onSaveProgress}
        disabled={actionBusy === true}
        accessibilityRole="button"
        accessibilityLabel="Save progress and go back"
        accessibilityState={{ disabled: actionBusy === true }}
        style={({ pressed }) => [styles.footerBtn, styles.secondaryBtn, pressed && styles.actionPressed]}
        testID="lab-review-save-progress"
      >
        <Text style={styles.actionLabel}>Save progress</Text>
      </Pressable>
      <Pressable
        onPress={onFinishReview}
        disabled={finishDisabled}
        accessibilityRole="button"
        accessibilityLabel={
          finishDisabled
            ? "Finish review, disabled until you accept at least one result"
            : `Finish review, ${acceptedCount} accepted results`
        }
        accessibilityState={{ disabled: finishDisabled }}
        style={({ pressed }) => [
          styles.footerBtn,
          styles.primaryBtn,
          finishDisabled && styles.actionDisabled,
          pressed && !finishDisabled && styles.actionPressed,
        ]}
        testID="lab-review-finish"
      >
        {actionBusy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryLabel}>Finish review</Text>
        )}
      </Pressable>
    </View>
  );
}

export function LabReviewDetailContent({
  status,
  error,
  requestId,
  data,
  onRetry,
  actionBusy = false,
  savingCandidateId = null,
  hideFooter = false,
  onAcceptCandidate,
  onEditCandidate,
  onRejectCandidate,
  onSaveProgress,
  onFinishReview,
}: LabReviewDetailContentProps) {
  const [editCandidate, setEditCandidate] = useState<LabReviewCandidateDto | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editFlag, setEditFlag] = useState("");

  const groups = useMemo(() => {
    if (!data) return { matched: [], needsReview: [], unmatched: [] as LabReviewCandidateDto[] };
    const all = [...data.candidates, ...data.unmatched];
    return {
      matched: groupCandidates(all, "matched"),
      needsReview: groupCandidates(all, "needs_review"),
      unmatched: groupCandidates(all, "unmatched"),
    };
  }, [data]);

  const actionCounts = useMemo(() => {
    if (!data) return { accepted: 0, rejected: 0, corrected: 0, unresolved: 0 };
    return countReviewActionStatuses(data);
  }, [data]);

  const openEdit = (candidateId: string) => {
    if (!data) return;
    const hit = [...data.candidates, ...data.unmatched].find((c) => c.id === candidateId);
    if (!hit) return;
    setEditCandidate(hit);
    setEditValue(hit.rawResult);
    setEditFlag(hit.flagLabel ?? "");
  };

  const submitEdit = () => {
    if (!editCandidate) return;
    const valueText = editValue.trim();
    const flagText = editFlag.trim();
    onEditCandidate(editCandidate.id, {
      ...(valueText.length > 0
        ? {
            resultValueText: valueText,
          }
        : {}),
      rawFlag: flagText.length > 0 ? flagText : null,
    });
    setEditCandidate(null);
  };

  if (status === "partial") {
    return <LoadingState message="Loading review…" testID="lab-review-detail-loading" />;
  }
  if (status === "error") {
    return (
      <ErrorState
        message={error ?? "Could not load review"}
        requestId={requestId ?? null}
        {...(onRetry ? { onRetry } : {})}
        testID="lab-review-detail-error"
      />
    );
  }
  if (!data) return null;

  const summary = data.summary;
  const collected = formatReviewDate(summary.collectedAt);
  const reported = formatReviewDate(summary.reportedAt);
  const fasting = fastingLabel(summary.fasting);
  const includedAccepted = actionCounts.accepted + actionCounts.corrected;

  return (
    <View style={styles.root} testID="lab-review-detail">
      <View style={styles.card} testID="lab-review-summary">
        <Text style={styles.title} accessibilityRole="header">
          {summary.safeDisplayFilename}
        </Text>
        <Text style={styles.status} testID="lab-review-report-status">
          {reportReviewStatusLabel(summary.status)}
        </Text>
        {summary.laboratoryName ? (
          <Text style={styles.meta}>Laboratory: {summary.laboratoryName}</Text>
        ) : null}
        {collected ? <Text style={styles.meta}>Collected {collected}</Text> : null}
        {reported ? <Text style={styles.meta}>Reported {reported}</Text> : null}
        {fasting ? <Text style={styles.meta}>{fasting}</Text> : null}
        <Text style={styles.meta} testID="lab-review-summary-counts">
          {reviewSummaryCountsLabel(summary)}
        </Text>
        <Text style={styles.meta} testID="lab-review-selection-counts">
          {includedAccepted} marked for inclusion · {actionCounts.rejected} rejected ·{" "}
          {actionCounts.unresolved} unresolved
        </Text>
        {data.warningMessages.length > 0 ? (
          <View style={styles.warningsBlock} testID="lab-review-warnings">
            {data.warningMessages.map((msg) => (
              <Text key={msg} style={styles.warningText}>
                {msg}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <CandidateGroupSection
        title={LAB_REVIEW_GROUP_LABELS.matched}
        candidates={groups.matched}
        testId="lab-review-group-matched"
        disabled={actionBusy}
        savingCandidateId={savingCandidateId}
        onAcceptCandidate={onAcceptCandidate}
        onEditCandidate={openEdit}
        onRejectCandidate={onRejectCandidate}
      />
      <CandidateGroupSection
        title={LAB_REVIEW_GROUP_LABELS.needs_review}
        candidates={groups.needsReview}
        testId="lab-review-group-needs-review"
        disabled={actionBusy}
        savingCandidateId={savingCandidateId}
        onAcceptCandidate={onAcceptCandidate}
        onEditCandidate={openEdit}
        onRejectCandidate={onRejectCandidate}
      />
      <CandidateGroupSection
        title={LAB_REVIEW_GROUP_LABELS.unmatched}
        candidates={groups.unmatched}
        testId="lab-review-group-unmatched"
        disabled={actionBusy}
        savingCandidateId={savingCandidateId}
        onAcceptCandidate={onAcceptCandidate}
        onEditCandidate={openEdit}
        onRejectCandidate={onRejectCandidate}
      />

      <ReportMetadataSection metadata={data.metadata} />

      {!hideFooter ? (
        <LabReviewActionsFooter
          actionBusy={actionBusy}
          acceptedCount={includedAccepted}
          rejectedCount={actionCounts.rejected}
          unresolvedCount={actionCounts.unresolved}
          onSaveProgress={onSaveProgress}
          onFinishReview={onFinishReview}
        />
      ) : null}

      <Modal
        visible={editCandidate != null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditCandidate(null)}
      >
        <View style={styles.modalBackdrop} testID="lab-review-edit-modal">
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Correct result</Text>
            <Text style={styles.footerHint}>
              Corrections are saved separately. The original extracted value stays on file for audit.
            </Text>
            {editCandidate ? (
              <Text style={styles.meta}>Original: {editCandidate.rawResult}</Text>
            ) : null}
            <Text style={styles.metaLabel}>Corrected value</Text>
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              testID="lab-review-edit-value"
            />
            <Text style={styles.metaLabel}>Flag (optional)</Text>
            <TextInput
              value={editFlag}
              onChangeText={setEditFlag}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
              testID="lab-review-edit-flag"
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setEditCandidate(null)}
                style={[styles.footerBtn, styles.secondaryBtn]}
                testID="lab-review-edit-cancel"
              >
                <Text style={styles.actionLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submitEdit}
                style={[styles.footerBtn, styles.primaryBtn]}
                testID="lab-review-edit-save"
              >
                <Text style={styles.primaryLabel}>Save correction</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12, paddingBottom: 32 },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    padding: 15,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  status: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 22,
  },
  metaLabel: {
    fontSize: 14,
    color: UI_TEXT_TERTIARY_LABEL,
    flexShrink: 0,
  },
  metaValue: {
    fontSize: 14,
    color: UI_TEXT_PRIMARY,
    flex: 1,
    textAlign: "right",
  },
  groupHint: {
    fontSize: 13,
    color: UI_TEXT_TERTIARY_LABEL,
    marginBottom: 4,
  },
  warningsBlock: { gap: 4, marginTop: 4 },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  candidateRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 12,
    marginTop: 4,
    gap: 10,
  },
  candidateMain: { gap: 4 },
  candidateName: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  rawLabel: {
    fontSize: 13,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  valueGrid: { gap: 2, marginTop: 2 },
  valueCell: {
    fontSize: 14,
    color: UI_TEXT_SECONDARY,
  },
  valueStrong: {
    color: UI_TEXT_PRIMARY,
    fontWeight: "600",
  },
  panelName: {
    fontSize: 13,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  reviewStatus: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  rejectBtn: {
    backgroundColor: "rgba(180, 35, 24, 0.1)",
    borderColor: "rgba(180, 35, 24, 0.35)",
  },
  acceptLabel: { color: "#86EFAC", fontSize: 14, fontWeight: "600" },
  rejectLabel: { color: "#FDA29B", fontSize: 14, fontWeight: "600" },
  actionLabel: { color: UI_TEXT_PRIMARY, fontSize: 14, fontWeight: "600" },
  actionDisabled: { opacity: 0.5 },
  actionPressed: { opacity: 0.85 },
  footer: {
    gap: 10,
    marginTop: 4,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: UI_SCREEN_BG,
  },
  footerHint: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_SECONDARY,
  },
  footerCounts: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  footerBtn: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryBtn: {
    ...elevatedCardSurfaceStyle,
  },
  primaryBtn: {
    backgroundColor: SYSTEM_ACCENT,
  },
  primaryLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    color: UI_TEXT_PRIMARY,
    fontSize: 15,
  },
  modalActions: { gap: 8, marginTop: 4 },
});
