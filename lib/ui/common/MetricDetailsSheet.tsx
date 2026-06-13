import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
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

/** A titled block of explainer copy (e.g. "Why it matters"). */
export type MetricDetailsSection = {
  heading: string;
  body: string;
};

export type MetricDetailsSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: string;
  /** Legacy single-paragraph explanation (still used by simpler callers). */
  body?: string;
  /** Optional "How to use this" actionable instruction, shown under the body in its own block. */
  instruction?: string;
  /**
   * Structured, multi-section explainer. When provided, each section renders as a labelled block
   * (heading + paragraph) in order — used by the world-class Program Overview explainers.
   */
  sections?: MetricDetailsSection[];
  sourceLine?: string;
  contextLine?: string;
};

/**
 * Bottom-sheet style metric explainer (dark theme, no new dependencies). Supports either a single
 * `body` paragraph or a list of structured `sections`.
 */
export function MetricDetailsSheet({
  visible,
  onClose,
  title,
  value,
  body,
  instruction,
  sections,
  sourceLine,
  contextLine,
}: MetricDetailsSheetProps): React.ReactElement {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID="metric-details-sheet"
    >
      <View style={styles.root} accessibilityViewIsModal>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Dismiss metric details"
        />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} accessibilityElementsHidden />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.value}>{value}</Text>
            {body ? <Text style={styles.body}>{body}</Text> : null}
            {sections?.map((section) => (
              <View
                key={section.heading}
                style={styles.section}
                testID={`metric-details-section-${section.heading}`}
              >
                <Text style={styles.sectionHeading}>{section.heading}</Text>
                <Text style={styles.sectionBody}>{section.body}</Text>
              </View>
            ))}
            {instruction ? (
              <View style={styles.instructionBlock} testID="metric-details-instruction">
                <Text style={styles.instructionHeading}>How to use this</Text>
                <Text style={styles.instructionBody}>{instruction}</Text>
              </View>
            ) : null}
            {sourceLine ? <Text style={styles.meta}>{sourceLine}</Text> : null}
            {contextLine ? <Text style={styles.meta}>{contextLine}</Text> : null}
          </ScrollView>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={({ pressed }) => [styles.done, pressed && styles.donePressed]}
          >
            <Text style={styles.doneLabel}>Done</Text>
          </Pressable>
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
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: UI_TEXT_MUTED,
    marginBottom: 12,
    opacity: 0.85,
  },
  scrollContent: {
    paddingBottom: 12,
    gap: 10,
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
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_SECONDARY,
  },
  section: {
    marginTop: 6,
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
  instructionBlock: {
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    gap: 6,
  },
  instructionHeading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: UI_TEXT_MUTED,
  },
  instructionBody: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_PRIMARY,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
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
