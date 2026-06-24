// lib/data/health-assessment/categories.ts
import type { AssessmentCategory } from "@/lib/data/health-assessment/types";

export type AssessmentCategoryMeta = {
  id: AssessmentCategory;
  title: string;
  subtitle: string;
};

export const ASSESSMENT_CATEGORY_META: readonly AssessmentCategoryMeta[] = [
  {
    id: "identity",
    title: "Identity",
    subtitle: "Basics that shape your health context.",
  },
  {
    id: "goals",
    title: "Goals",
    subtitle: "What you want to achieve and why.",
  },
  {
    id: "health-history",
    title: "Health History",
    subtitle: "Past and present health factors.",
  },
  {
    id: "fitness",
    title: "Fitness Assessment",
    subtitle: "Training background and capacity.",
  },
  {
    id: "nutrition",
    title: "Nutrition Assessment",
    subtitle: "Eating patterns and habits.",
  },
  {
    id: "recovery",
    title: "Recovery Assessment",
    subtitle: "Sleep, stress, and recovery signals.",
  },
  {
    id: "biomarkers",
    title: "Biomarker Assessment",
    subtitle: "Labs and body composition data.",
  },
] as const;

export function getAssessmentCategoryMeta(
  category: AssessmentCategory,
): AssessmentCategoryMeta {
  const meta = ASSESSMENT_CATEGORY_META.find((c) => c.id === category);
  if (meta == null) {
    throw new Error(`Unknown assessment category: ${category}`);
  }
  return meta;
}
