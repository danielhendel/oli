/**
 * Canonical authenticated consumer home (Stage 1B — Today).
 *
 * Filesystem route remains `dash` for Expo Router / CI route proofs.
 * User-facing product name is Today. All auth and root redirects must use
 * {@link CONSUMER_HOME_HREF} rather than Command Center or ad-hoc strings.
 */

import type { Href } from "expo-router";

import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";

/** Canonical post-auth / restored-session destination. */
export const CONSUMER_HOME_HREF = OLI_TAB_ROUTES.dash as Href;

/** Expo Router tab name for the Today home (filesystem: dash). */
export const CONSUMER_HOME_TAB_NAME = "dash" as const;

/** User-facing primary-home label. */
export const CONSUMER_HOME_LABEL = "Today" as const;

/** Accessibility label for the Today tab / primary dock item. */
export const CONSUMER_HOME_A11Y_LABEL = "Today" as const;

/** Primary dock testID (stable; filesystem id remains dash). */
export const CONSUMER_HOME_TEST_ID = "oli-tab-dash" as const;

/** Legacy Command Center path — must not be an auth or primary-home destination. */
export const COMMAND_CENTER_PATH = "/(app)/command-center" as const;

/** Placeholder Daily Recap path — deep links redirect to Today. */
export const DAILY_RECAP_PATH = "/(app)/dash/daily-recap" as const;

/** Canonical Supplements destination (Nutrition-owned; not the Health-record placeholder). */
export const CANONICAL_SUPPLEMENTS_HREF = "/(app)/nutrition/supplements" as const;

/** Soft-removed Health-record placeholder supplements path. */
export const LEGACY_SUPPLEMENTS_PLACEHOLDER_PATH = "/(app)/supplements" as const;
