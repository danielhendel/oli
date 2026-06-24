// lib/data/health-assessment/useHealthAssessmentFlow.ts
import { useCallback, useMemo } from "react";

import { getAssessmentCategoryMeta } from "@/lib/data/health-assessment/categories";
import {
  categoryProgress,
  hasAssessmentProgress,
} from "@/lib/data/health-assessment/buildCurrentStateProfile";
import {
  getCurrentCategory,
  healthAssessmentStore,
  isOnSummaryStep,
  useCurrentStateProfile,
  useHealthAssessmentState,
} from "@/lib/data/health-assessment/healthAssessmentStore";
import { getQuestionsForCategory } from "@/lib/data/health-assessment/questionRegistry";
import type {
  AssessmentAnswerValue,
  AssessmentCategory,
  AssessmentQuestion,
} from "@/lib/data/health-assessment/types";
import { ASSESSMENT_CATEGORIES } from "@/lib/data/health-assessment/types";

export type HealthAssessmentFlowVm = {
  state: ReturnType<typeof useHealthAssessmentState>;
  profile: ReturnType<typeof useCurrentStateProfile>;
  currentCategory: AssessmentCategory | null;
  currentCategoryMeta: ReturnType<typeof getAssessmentCategoryMeta> | null;
  currentQuestions: AssessmentQuestion[];
  isSummary: boolean;
  categoryIndex: number;
  totalCategories: number;
  overallProgress: number;
  hasStarted: boolean;
  canGoBack: boolean;
  canGoNext: boolean;
  isLastCategory: boolean;
  getAnswer: (questionId: string) => AssessmentAnswerValue | undefined;
  setAnswer: (
    questionId: string,
    category: AssessmentCategory,
    value: AssessmentAnswerValue,
  ) => void;
  goBack: () => void;
  goNext: () => void;
  goToCategory: (index: number) => void;
  finishAssessment: () => void;
  restartAssessment: () => void;
};

export function useHealthAssessmentFlow(): HealthAssessmentFlowVm {
  const state = useHealthAssessmentState();
  const profile = useCurrentStateProfile();

  const currentCategory = getCurrentCategory(state);
  const isSummary = isOnSummaryStep(state);

  const currentCategoryMeta = useMemo(() => {
    if (currentCategory == null) return null;
    return getAssessmentCategoryMeta(currentCategory);
  }, [currentCategory]);

  const currentQuestions = useMemo(() => {
    if (currentCategory == null) return [];
    return getQuestionsForCategory(currentCategory);
  }, [currentCategory]);

  const overallProgress = useMemo(() => {
    const perCategory = ASSESSMENT_CATEGORIES.map((c) => categoryProgress(state, c));
    if (perCategory.length === 0) return 0;
    const sum = perCategory.reduce((a, b) => a + b, 0);
    return sum / perCategory.length;
  }, [state]);

  const hasStarted = hasAssessmentProgress(state);
  const categoryIndex = state.currentCategoryIndex;
  const totalCategories = ASSESSMENT_CATEGORIES.length;
  const isLastCategory = categoryIndex === totalCategories - 1;
  const canGoBack = categoryIndex > 0 || isSummary;
  const canGoNext = !isSummary;

  const getAnswer = useCallback(
    (questionId: string): AssessmentAnswerValue | undefined => {
      return state.answers[questionId]?.value;
    },
    [state.answers],
  );

  const setAnswer = useCallback(
    (questionId: string, category: AssessmentCategory, value: AssessmentAnswerValue) => {
      healthAssessmentStore.setAnswer(questionId, category, value);
    },
    [],
  );

  const goBack = useCallback(() => {
    if (isSummary) {
      healthAssessmentStore.setCategoryIndex(ASSESSMENT_CATEGORIES.length - 1);
      return;
    }
    healthAssessmentStore.goToPreviousCategory();
  }, [isSummary]);

  const goNext = useCallback(() => {
    if (isLastCategory) {
      healthAssessmentStore.markCompleted();
      return;
    }
    healthAssessmentStore.goToNextCategory();
  }, [isLastCategory]);

  const goToCategory = useCallback((index: number) => {
    healthAssessmentStore.setCategoryIndex(index);
  }, []);

  const finishAssessment = useCallback(() => {
    healthAssessmentStore.markCompleted();
  }, []);

  const restartAssessment = useCallback(() => {
    healthAssessmentStore.reset();
  }, []);

  return {
    state,
    profile,
    currentCategory,
    currentCategoryMeta,
    currentQuestions,
    isSummary,
    categoryIndex,
    totalCategories,
    overallProgress,
    hasStarted,
    canGoBack,
    canGoNext,
    isLastCategory,
    getAnswer,
    setAnswer,
    goBack,
    goNext,
    goToCategory,
    finishAssessment,
    restartAssessment,
  };
}
