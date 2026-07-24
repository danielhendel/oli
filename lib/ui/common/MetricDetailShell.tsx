/**
 * Reusable metric-detail bottom-sheet shell (Phase 2D).
 *
 * Near-full-screen Modal with:
 * - fixed header (handle, title, Close)
 * - independently scrolling body
 * - fixed Done footer with Safe Area clearance
 *
 * Domain thresholds/averages stay outside this component.
 * Legacy MetricDetailsSheet remains for other metrics.
 */

import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  METRIC_DETAIL_BODY_END_SPACING,
  METRIC_DETAIL_FOOTER_MIN_HEIGHT,
  METRIC_DETAIL_HORIZONTAL_PADDING,
  METRIC_DETAIL_TOP_BACKDROP_GAP,
  METRIC_DETAIL_TOP_CORNER_RADIUS,
  metricDetailBodyBottomInset,
  metricDetailSheetHeight,
} from "@/lib/ui/common/metricDetailShellLayout";
import {
  UI_BORDER_HAIRLINE,
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
  const { height: windowHeight } = useWindowDimensions();
  const [measuredFooterChrome, setMeasuredFooterChrome] = useState(METRIC_DETAIL_FOOTER_MIN_HEIGHT);

  const sheetHeight = metricDetailSheetHeight({
    windowHeight,
    topSafeArea: insets.top,
    topBackdropGap: METRIC_DETAIL_TOP_BACKDROP_GAP,
  });

  const bottomSafe = Math.max(insets.bottom, 12);
  const bodyBottomInset = showDone
    ? metricDetailBodyBottomInset({
        footerHeight: measuredFooterChrome,
        bottomSafeArea: bottomSafe,
        endSpacing: METRIC_DETAIL_BODY_END_SPACING,
      })
    : bottomSafe + METRIC_DETAIL_BODY_END_SPACING;

  const onFooterChromeLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - measuredFooterChrome) > 0.5) {
      setMeasuredFooterChrome(h);
    }
  };

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
          testID={`${testID}-sheet`}
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              borderTopLeftRadius: METRIC_DETAIL_TOP_CORNER_RADIUS,
              borderTopRightRadius: METRIC_DETAIL_TOP_CORNER_RADIUS,
            },
            contentStyle,
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header} testID={`${testID}-header`}>
            <View style={styles.handle} accessibilityElementsHidden importantForAccessibility="no" />
            <View style={styles.headerRow}>
              <Text
                style={styles.title}
                accessibilityRole="header"
                numberOfLines={2}
              >
                {title}
              </Text>
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
            <View style={styles.headerDivider} importantForAccessibility="no" />
          </View>

          <ScrollView
            testID={`${testID}-scroll`}
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            bounces
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bodyBottomInset }]}
          >
            <View
              accessible
              accessibilityLabel={accessibilitySummary ?? `${title}. ${heroValue}.`}
            >
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
            <View
              style={[styles.footer, { paddingBottom: bottomSafe }]}
              testID={`${testID}-footer`}
            >
              <View onLayout={onFooterChromeLayout}>
                <View style={styles.footerDivider} importantForAccessibility="no" />
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                  style={({ pressed }) => [styles.done, pressed && styles.donePressed]}
                  testID={`${testID}-done`}
                >
                  <Text style={styles.doneLabel}>Done</Text>
                </Pressable>
              </View>
            </View>
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
    paddingTop: 8,
    paddingHorizontal: METRIC_DETAIL_HORIZONTAL_PADDING,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_STRONG,
    overflow: "hidden",
  },
  header: {
    flexShrink: 0,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: UI_TEXT_MUTED,
    opacity: 0.85,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
    paddingBottom: 10,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  closeButton: {
    flexShrink: 0,
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
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_HAIRLINE,
    marginHorizontal: -METRIC_DETAIL_HORIZONTAL_PADDING,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    gap: 12,
    paddingTop: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.35,
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
  footer: {
    flexShrink: 0,
    backgroundColor: UI_PANEL_SURFACE,
    paddingTop: 8,
  },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_HAIRLINE,
    marginHorizontal: -METRIC_DETAIL_HORIZONTAL_PADDING,
    marginBottom: 8,
  },
  done: {
    minHeight: METRIC_DETAIL_FOOTER_MIN_HEIGHT,
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
