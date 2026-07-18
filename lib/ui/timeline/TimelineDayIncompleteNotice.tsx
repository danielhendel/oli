// Compact honest notice when selected-day history completeness is unproven.
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export const TIMELINE_DAY_INCOMPLETE_NOTICE_COPY =
  "Some activity may be missing. Try again.";

export type TimelineDayIncompleteNoticeProps = {
  onRetry: () => void;
};

export function TimelineDayIncompleteNotice({ onRetry }: TimelineDayIncompleteNoticeProps) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="summary"
      accessibilityLabel={TIMELINE_DAY_INCOMPLETE_NOTICE_COPY}
      testID="timeline-day-incomplete-notice"
    >
      <Text style={styles.message}>{TIMELINE_DAY_INCOMPLETE_NOTICE_COPY}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        style={styles.retry}
        testID="timeline-day-incomplete-retry"
      >
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 8,
  },
  message: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  retry: {
    alignSelf: "flex-start",
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  retryText: {
    color: SYSTEM_ACCENT,
    fontSize: 15,
    fontWeight: "600",
  },
});
