/**
 * Soft-removed Health-record supplements placeholder (Stage 1B).
 * Canonical Supplements lives under Nutrition.
 */
import { Redirect } from "expo-router";

import { CANONICAL_SUPPLEMENTS_HREF } from "@/lib/navigation/consumerHome";

export default function SupplementsPlaceholderRedirect() {
  return <Redirect href={CANONICAL_SUPPLEMENTS_HREF as never} />;
}
