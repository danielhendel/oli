// lib/ui/health-assessment/HealthAssessmentScreen.tsx
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { HEALTH_BASELINE_ROUTES } from "@/lib/data/health-baseline/routes";
import { useHealthAssessmentFlow } from "@/lib/data/health-assessment/useHealthAssessmentFlow";
import { AssessmentQuestionInput } from "@/lib/ui/health-assessment/AssessmentQuestionInput";
import { CurrentStateProfileSummary } from "@/lib/ui/health-assessment/CurrentStateProfileSummary";
import { HealthAssessmentProgressHeader } from "@/lib/ui/health-assessment/HealthAssessmentProgressHeader";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_APP_SCREEN_BG,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export function HealthAssessmentScreen(): React.ReactElement {
  const flow = useHealthAssessmentFlow();
  const router = useRouter();
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  const headerTitle = flow.isSummary
    ? "Your Current State"
    : (flow.currentCategoryMeta?.title ?? "Health Assessment");

  const headerSubtitle = flow.isSummary
    ? "Review your profile before moving to baseline planning."
    : (flow.currentCategoryMeta?.subtitle ?? "");

  return (
    <View style={styles.screen} testID="health-assessment-screen">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <HealthAssessmentProgressHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          categoryIndex={flow.categoryIndex}
          totalCategories={flow.totalCategories}
          overallProgress={flow.overallProgress}
        />

        {flow.isSummary ? (
          <>
            <CurrentStateProfileSummary profile={flow.profile} />
            <Pressable
              onPress={() => router.push(HEALTH_BASELINE_ROUTES.baseline)}
              style={({ pressed }) => [styles.baselineCta, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="View Health Baseline"
              testID="health-assessment-view-baseline"
            >
              <Text style={styles.baselineCtaText}>View Health Baseline</Text>
            </Pressable>
          </>
        ) : (
          flow.currentQuestions.map((question) => (
            <AssessmentQuestionInput
              key={question.id}
              question={question}
              value={flow.getAnswer(question.id)}
              onChange={(value) => flow.setAnswer(question.id, question.category, value)}
            />
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        {flow.canGoBack ? (
          <Pressable
            onPress={flow.goBack}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="health-assessment-back"
          >
            <Text style={styles.secondaryBtnText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.secondaryBtnPlaceholder} />
        )}

        <Pressable
          onPress={flow.isSummary ? () => router.push(HEALTH_BASELINE_ROUTES.baseline) : flow.goNext}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel={
            flow.isSummary
              ? "View Health Baseline"
              : flow.isLastCategory
                ? "Finish"
                : "Continue"
          }
          testID="health-assessment-next"
        >
          <Text style={styles.primaryBtnText}>
            {flow.isSummary ? "View Baseline" : flow.isLastCategory ? "Finish" : "Continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  content: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 16,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: UI_APP_SCREEN_BG,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  secondaryBtn: {
    minWidth: 96,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryBtnPlaceholder: {
    minWidth: 96,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  btnPressed: {
    opacity: 0.9,
  },
  baselineCta: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(58, 91, 219, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  baselineCtaText: {
    fontSize: 16,
    fontWeight: "700",
    color: SYSTEM_ACCENT,
  },
});
