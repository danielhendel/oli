// lib/data/program/buildBuilderPlaceholderModel.ts
/**
 * Pure copy builder for the premium "coming soon" builder placeholders
 * (cardio / nutrition / recovery). No IO, no persistence.
 */
import type { PlaceholderBuilderModel } from "@/lib/data/program/types";

type PlaceholderType = PlaceholderBuilderModel["type"];

const PLACEHOLDER_COPY: Record<
  PlaceholderType,
  { title: string; intro: string; capabilities: string[] }
> = {
  cardio: {
    title: "Cardio Builder",
    intro:
      "Plan your aerobic engine: structured zones, intervals, and weekly targets that adapt to your training.",
    capabilities: [
      "Zone 2 base & weekly minutes",
      "VO₂ Max intervals",
      "Daily steps targets",
      "Heart-rate zones",
      "Cardiac drift tracking",
      "Aerobic efficiency & RPE",
    ],
  },
  nutrition: {
    title: "Nutrition Builder",
    intro:
      "Fuel the plan: calories and macros by day, meal timing, and rules that adjust with your progress.",
    capabilities: [
      "Calorie targets",
      "Macros by day",
      "Meal timing",
      "Hydration",
      "Supplements & fiber",
      "Weekly adjustment rules",
    ],
  },
  recovery: {
    title: "Recovery Builder",
    intro:
      "Protect your progress: readiness-driven recovery with deload logic and a single recovery score.",
    capabilities: [
      "Sleep targets",
      "HRV / RHR readiness",
      "Soreness & energy",
      "Joint pain & mobility",
      "Deload rules",
      "Recovery score",
    ],
  },
};

/** Build the placeholder view-model for a non-workout builder. */
export function buildBuilderPlaceholderModel(type: PlaceholderType): PlaceholderBuilderModel {
  const copy = PLACEHOLDER_COPY[type];
  return {
    type,
    title: copy.title,
    intro: copy.intro,
    comingSoonLabel: "Coming soon",
    capabilities: [...copy.capabilities],
  };
}
