/**
 * Stack-mounted floating nav (Manage + pill) visibility.
 * Tab routes use the real tab navigator chrome only — this applies to `(app)/…` stack screens.
 *
 * Match Expo Router `usePathname()` output (no route groups in the path).
 */

/** Main category landing screens only (no analytics, logging, detail, or nested library paths). */
export const FLOATING_NAV_STACK_PATH_EXACT = [
  "/body",
  "/activity",
  "/workouts",
  "/workouts/overview",
  "/cardio",
  "/nutrition",
  "/nutrition/overview",
  "/recovery",
  "/recovery/sleep",
  "/labs",
  "/dna",
] as const;

const ALLOWED = new Set<string>(FLOATING_NAV_STACK_PATH_EXACT);

export function normalizePathname(pathname: string | null | undefined): string {
  if (pathname == null || pathname === "") return "/";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * Whether to render {@link OliFloatingNavigationHost} for the current stack URL.
 * Tabs (`/dash`, `/timeline`, …) are never in the allowlist — the overlay stays hidden there.
 */
export function shouldShowStackFloatingNavForPathname(pathname: string | null | undefined): boolean {
  return ALLOWED.has(normalizePathname(pathname));
}
