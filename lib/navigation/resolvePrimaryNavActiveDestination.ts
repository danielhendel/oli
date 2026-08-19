import type { PrimaryNavigationDestination } from "@/lib/navigation/primaryNavigationConfig";
import { normalizePathname } from "@/lib/navigation/normalizePathname";

function isHomePath(pathname: string): boolean {
  return pathname === "/dash" || pathname.startsWith("/dash/");
}

function isPlanPath(pathname: string): boolean {
  return pathname === "/program" || pathname.startsWith("/program/");
}

function isProgressPath(pathname: string): boolean {
  return (
    pathname === "/progress" ||
    pathname.startsWith("/progress/") ||
    pathname === "/timeline" ||
    pathname.startsWith("/timeline/") ||
    pathname === "/fitness-goals" ||
    pathname.startsWith("/fitness-goals/")
  );
}

const YOU_FAMILY_EXACT = new Set([
  "/you",
  "/profile",
  "/settings",
  "/labs",
  "/failures",
  "/documents",
  "/library",
]);

const YOU_FAMILY_PREFIXES = [
  "/you/",
  "/profile/",
  "/settings/",
  "/labs/",
  "/failures/",
  "/documents/",
  "/library/",
] as const;

function isYouFamilyPath(pathname: string): boolean {
  if (YOU_FAMILY_EXACT.has(pathname)) return true;
  return YOU_FAMILY_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Domain current-state routes opened from Home cards. Highlight Home, not a
 * removed domain primary destination.
 */
function isHomeDomainPath(pathname: string): boolean {
  return (
    pathname === "/body" ||
    pathname.startsWith("/body/") ||
    pathname === "/activity" ||
    pathname.startsWith("/activity/") ||
    pathname === "/workouts" ||
    pathname.startsWith("/workouts/") ||
    pathname === "/cardio" ||
    pathname.startsWith("/cardio/") ||
    pathname === "/nutrition" ||
    pathname.startsWith("/nutrition/") ||
    pathname === "/recovery" ||
    pathname.startsWith("/recovery/") ||
    pathname === "/energy" ||
    pathname.startsWith("/energy/")
  );
}

export type ResolvePrimaryNavActiveDestinationArgs = {
  pathname: string | null | undefined;
  /** @deprecated Health menu is not a primary destination. Ignored. */
  healthMenuOpen?: boolean;
  /**
   * Focused tab route name from the real tab navigator (when mounted).
   */
  focusedTabName?: string | null;
};

/**
 * Resolve which primary dock destination should appear selected.
 * Returns `null` when no primary destination should highlight.
 */
export function resolvePrimaryNavActiveDestination(
  args: ResolvePrimaryNavActiveDestinationArgs,
): PrimaryNavigationDestination | null {
  const pathname = normalizePathname(args.pathname);
  const focused = args.focusedTabName ?? null;

  // Prefer the mounted tab navigator’s focused route; pathname can lag during
  // tab switches and is mocked independently in unit tests.
  if (focused === "dash") return "home";
  if (focused === "program") return "plan";
  if (focused === "progress" || focused === "timeline") return "progress";
  if (focused === "you" || focused === "profile" || focused === "library") return "you";

  if (isHomePath(pathname)) return "home";
  if (isPlanPath(pathname)) return "plan";
  if (isProgressPath(pathname)) return "progress";
  if (isYouFamilyPath(pathname)) return "you";
  if (isHomeDomainPath(pathname)) return "home";

  return null;
}
