import type { PrimaryNavigationDestination } from "@/lib/navigation/primaryNavigationConfig";
import { normalizePathname } from "@/lib/navigation/normalizePathname";

/**
 * Pathname prefixes / exact matches that belong to the Health navigation family.
 * When the user is on these screens, Health may remain the selected dock family.
 * Stage 1B: real domain modules + Profile + Labs + Nutrition supplements.
 */
const HEALTH_FAMILY_EXACT = new Set([
  "/profile",
  "/body",
  "/activity",
  "/recovery",
  "/labs",
  "/nutrition/supplements",
  // Soft-removed placeholders may still be deep-linked; keep Health selected.
  "/medical-history",
  "/scans",
  "/medication",
  "/supplements",
  "/dna",
]);

const HEALTH_FAMILY_PREFIXES = [
  "/profile/",
  "/body/",
  "/activity/",
  "/recovery/",
  "/labs/",
  "/nutrition/supplements",
  "/medical-history/",
  "/scans/",
  "/medication/",
  "/supplements/",
  "/dna/",
] as const;

function isHealthFamilyPath(pathname: string): boolean {
  if (HEALTH_FAMILY_EXACT.has(pathname)) return true;
  return HEALTH_FAMILY_PREFIXES.some((p) => pathname.startsWith(p));
}

function isStrengthPath(pathname: string): boolean {
  return pathname === "/workouts" || pathname === "/workouts/overview" || pathname.startsWith("/workouts/");
}

function isCardioPath(pathname: string): boolean {
  return pathname === "/cardio" || pathname.startsWith("/cardio/");
}

function isNutritionPath(pathname: string): boolean {
  // Supplements is Health-family discoverability; other nutrition stays Nutrition dock.
  if (pathname === "/nutrition/supplements" || pathname.startsWith("/nutrition/supplements/")) {
    return false;
  }
  return pathname === "/nutrition" || pathname === "/nutrition/overview" || pathname.startsWith("/nutrition/");
}

function isDashPath(pathname: string): boolean {
  return pathname === "/dash" || pathname.startsWith("/dash/");
}

export type ResolvePrimaryNavActiveDestinationArgs = {
  pathname: string | null | undefined;
  /** When the Health menu overlay is open, Health is selected. */
  healthMenuOpen?: boolean;
  /**
   * Focused tab route name from the real tab navigator (when mounted).
   * Used for Dash / Profile tab focus when pathname alone is ambiguous.
   */
  focusedTabName?: string | null;
};

/**
 * Resolve which primary dock destination should appear selected.
 * Returns `null` when no primary destination should highlight (e.g. Timeline).
 */
export function resolvePrimaryNavActiveDestination(
  args: ResolvePrimaryNavActiveDestinationArgs,
): PrimaryNavigationDestination | null {
  if (args.healthMenuOpen) return "health";

  const pathname = normalizePathname(args.pathname);
  const focused = args.focusedTabName ?? null;

  if (focused === "dash" || isDashPath(pathname)) return "dash";
  if (isStrengthPath(pathname)) return "strength";
  if (isCardioPath(pathname)) return "cardio";
  if (isNutritionPath(pathname)) return "nutrition";
  if (focused === "profile" || isHealthFamilyPath(pathname)) return "health";

  return null;
}
