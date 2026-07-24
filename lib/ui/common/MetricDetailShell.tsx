/**
 * Reusable metric-detail bottom-sheet shell (Phase 2D).
 *
 * Presentation-only Modal foundation with slots. Domain thresholds/averages stay
 * outside this component. Legacy MetricDetailsSheet remains for other metrics.
 */

import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  UI_BORDER_STRONG,
  UI_OVERLAY,
  UI_PANEL_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type MetricDetailShellSection = {
  heading: string;
  body: string;
};

export type MetricDetailShellProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  heroValue: string;
  statusSentence?: string | null;
  referenceVisualization?: React.ReactNode;
  averages?: React.ReactNode;
  historySlot?: React.ReactNode;
  sections?: readonly MetricDetailShellSection[];
  dataAccuracyHeading?: string;
  dataAccuracyBody?: string | null;
  dataAccuracyMeta?: string | null;
  sourceLine?: string | null;
  loadingSlot?: React.ReactNode;
  errorSlot?: React.ReactNode;
  accessibilitySummary?: string;
  /** Retain large Done control for accessible dismissal (v1 default true). */
  showDone?: boolean;
  testID?: string;
  contentStyle?: StyleProp<ViewStyle>;
};

export function MetricDetailShell({
  visible,
  onClose,
  title,
  heroValue,
  statusSentence,
  referenceVisualization,
  averages,
  historySlot,
  sections,
  dataAccuracyHeading = "Data & accuracy",
  dataAccuracyBody,
  dataAccuracyMeta,
  sourceLine,
  loadingSlot,
  errorSlot,
  accessibilitySummary,
  showDone = true,
  testID = "metric-detail-shell",
  contentStyle,
}: MetricDetailShellProps): React.ReactElement {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.root} accessibilityViewIsModal>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Dismiss metric details"
          testID={`${testID}-backdrop`}
        />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }, contentStyle]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handleRow}>
            <View style={styles.handle} accessibilityElementsHidden />
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
              testID={`${testID}-close`}
            >
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View
              accessible
              accessibilityLabel={accessibilitySummary ?? `${title}. ${heroValue}.`}
            >
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              <Text style={styles.value}>{heroValue}</Text>
              {statusSentence ? <Text style={styles.status}>{statusSentence}</Text> : null}
            </View>

            {referenceVisualization}

            {loadingSlot}
            {errorSlot}
            {averages}
            {historySlot}

            {sections?.map((section) => (
              <View
                key={section.heading}
                style={styles.section}
                testID={`${testID}-section-${section.heading}`}
              >
                <Text style={styles.sectionHeading}>{section.heading}</Text>
                <Text style={styles.sectionBody}>{section.body}</Text>
              </View>
            ))}

            {dataAccuracyBody ? (
              <View style={styles.section} testID={`${testID}-data-accuracy`}>
                <Text style={styles.sectionHeading}>{dataAccuracyHeading}</Text>
                <Text style={styles.sectionBody}>{dataAccuracyBody}</Text>
                {sourceLine ? <Text style={styles.meta}>{sourceLine}</Text> : null}
                {dataAccuracyMeta ? <Text style={styles.meta}>{dataAccuracyMeta}</Text> : null}
              </View>
            ) : null}
          </ScrollView>

          {showDone ? (
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Done"
              style={({ pressed }) => [styles.done, pressed && styles.donePressed]}
              testID={`${testID}-done`}
            >
              <Text style={styles.doneLabel}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: UI_OVERLAY,
  },
  sheet: {
    backgroundColor: UI_PANEL_SURFACE,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingHorizontal: 20,
    maxHeight: "88%",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_STRONG,
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    minHeight: 44,
  },
  handle: {
    position: "absolute",
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: UI_TEXT_MUTED,
    opacity: 0.85,
  },
  closeButton: {
    position: "absolute",
    right: 0,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  closePressed: {
    opacity: 0.75,
  },
  closeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  scrollContent: {
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.35,
    marginTop: 4,
  },
  status: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_SECONDARY,
    marginTop: 6,
  },
  section: {
    marginTop: 4,
    gap: 6,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: UI_TEXT_MUTED,
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_SECONDARY,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
    marginTop: 4,
  },
  done: {
    marginTop: 4,
    marginBottom: 4,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  donePressed: {
    opacity: 0.85,
  },
  doneLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
});
