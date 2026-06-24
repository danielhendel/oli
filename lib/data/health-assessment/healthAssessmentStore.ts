// lib/data/health-assessment/healthAssessmentStore.ts
/**
 * In-memory Health Assessment draft store (session-scoped).
 * Mirrors workoutProgramDesignStore — no Firebase/API writes in Sprint A.
 */
import { useSyncExternalStore } from "react";

import { buildCurrentStateProfile } from "@/lib/data/health-assessment/buildCurrentStateProfile";
import type {
  AssessmentAnswer,
  AssessmentAnswerValue,
  AssessmentCategory,
  CurrentStateProfile,
  HealthAssessmentState,
} from "@/lib/data/health-assessment/types";
import { ASSESSMENT_CATEGORIES } from "@/lib/data/health-assessment/types";

export function buildEmptyHealthAssessmentState(): HealthAssessmentState {
  return {
    answers: {},
    currentCategoryIndex: 0,
    completedAt: null,
  };
}

let currentState: HealthAssessmentState = buildEmptyHealthAssessmentState();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function setState(next: HealthAssessmentState): void {
  currentState = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): HealthAssessmentState {
  return currentState;
}

export const healthAssessmentStore = {
  getSnapshot,
  subscribe,
  reset(): void {
    setState(buildEmptyHealthAssessmentState());
  },
  setAnswer(questionId: string, category: AssessmentCategory, value: AssessmentAnswerValue): void {
    const answer: AssessmentAnswer = { questionId, category, value };
    setState({
      ...currentState,
      answers: { ...currentState.answers, [questionId]: answer },
    });
  },
  clearAnswer(questionId: string): void {
    if (!(questionId in currentState.answers)) return;
    const nextAnswers = { ...currentState.answers };
    delete nextAnswers[questionId];
    setState({ ...currentState, answers: nextAnswers });
  },
  setCategoryIndex(index: number): void {
    const clamped = Math.max(0, Math.min(index, ASSESSMENT_CATEGORIES.length));
    setState({ ...currentState, currentCategoryIndex: clamped });
  },
  goToNextCategory(): void {
    const next = Math.min(
      currentState.currentCategoryIndex + 1,
      ASSESSMENT_CATEGORIES.length,
    );
    setState({ ...currentState, currentCategoryIndex: next });
  },
  goToPreviousCategory(): void {
    const prev = Math.max(currentState.currentCategoryIndex - 1, 0);
    setState({ ...currentState, currentCategoryIndex: prev });
  },
  markCompleted(): void {
    setState({
      ...currentState,
      completedAt: new Date().toISOString(),
      currentCategoryIndex: ASSESSMENT_CATEGORIES.length,
    });
  },
  /** Replace entire state (tests). */
  replace(state: HealthAssessmentState): void {
    setState(state);
  },
} as const;

export function useHealthAssessmentState(): HealthAssessmentState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useCurrentStateProfile(): CurrentStateProfile {
  const state = useHealthAssessmentState();
  return buildCurrentStateProfile(state);
}

export function getCurrentCategory(state: HealthAssessmentState): AssessmentCategory | null {
  if (state.currentCategoryIndex >= ASSESSMENT_CATEGORIES.length) return null;
  return ASSESSMENT_CATEGORIES[state.currentCategoryIndex] ?? null;
}

export function isOnSummaryStep(state: HealthAssessmentState): boolean {
  return state.currentCategoryIndex >= ASSESSMENT_CATEGORIES.length;
}
