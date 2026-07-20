/**
 * Single mount point for `useWeeklyFitnessCard` + `WeeklyFitnessCard`.
 *
 * Dash and Program must not both mount this host: the heavy multi-source hook
 * must run from exactly one active location controlled by
 * `isDashWeeklyProgressRelocationEnabled`.
 */
import React from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { useWeeklyFitnessCard } from "@/lib/data/dash/useWeeklyFitnessCard";
import {
  WEEKLY_FITNESS_CONSUMER_TITLE,
} from "@/lib/data/dash/dashWeeklyProgressRelocation";
import { WeeklyFitnessCard } from "@/lib/ui/dash/WeeklyFitnessCard";

export type WeeklyFitnessCardHostProps = {
  /** Consumer-visible card title. Defaults to legacy Dash “Weekly Fitness”. */
  title?: string;
  /** Optional supporting line under the heroes (defaults to card built-in when omitted). */
  subtitle?: string;
  /** Root accessibility label. Defaults to legacy “Weekly fitness card”. */
  cardAccessibilityLabel?: string;
};

export function WeeklyFitnessCardHost({
  title = WEEKLY_FITNESS_CONSUMER_TITLE,
  subtitle,
  cardAccessibilityLabel,
}: WeeklyFitnessCardHostProps): React.ReactElement {
  const { user } = useAuth();
  const weeklyFitness = useWeeklyFitnessCard();

  return (
    <WeeklyFitnessCard
      loading={weeklyFitness.loading}
      error={weeklyFitness.error}
      model={weeklyFitness.model}
      goalsHref={weeklyFitness.goalsHref}
      hasUser={user != null}
      title={title}
      {...(subtitle != null ? { subtitle } : {})}
      {...(cardAccessibilityLabel != null ? { cardAccessibilityLabel } : {})}
    />
  );
}
