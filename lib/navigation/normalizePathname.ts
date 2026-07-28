/**
 * Pathname helpers shared by navigation config (lib) and chrome (components).
 * Keep in lib so `lib/tsconfig.build.json` rootDir stays clean.
 */

export function normalizePathname(pathname: string | null | undefined): string {
  if (pathname == null || pathname === "") return "/";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}
