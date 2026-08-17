/**
 * Presentation-layer mapping only.
 * Canonical contracts, API paths, and storage continue to use Activity.
 */
export const ACTIVITY_CONSUMER_LABEL = "Movement" as const;
export const ACTIVITY_TECHNICAL_LABEL = "Activity" as const;

export const CONSUMER_DOMAIN_LABELS = {
  body: "Body",
  recovery: "Recovery",
  activity: ACTIVITY_CONSUMER_LABEL,
  strength: "Strength",
  cardio: "Cardio",
  nutrition: "Nutrition",
  health: "Health",
} as const;

export type TechnicalDomainId = keyof typeof CONSUMER_DOMAIN_LABELS;

export function consumerDomainLabel(technicalId: TechnicalDomainId): string {
  return CONSUMER_DOMAIN_LABELS[technicalId];
}
