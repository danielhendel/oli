/**
 * Paths that remain available while Auth is valid during pending deletion.
 * Pure helper — safe for unit tests without loading Firestore.
 */

export function isDeletionControlAllowlisted(method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  if (m === "OPTIONS") {
    return (
      pathname === "/account/delete" ||
      pathname === "/delete/latest" ||
      /^\/delete\/[^/]+$/.test(pathname)
    );
  }
  if (m === "POST" && pathname === "/account/delete") return true;
  if (m === "GET" && pathname === "/delete/latest") return true;
  if (m === "GET" && /^\/delete\/[^/]+$/.test(pathname)) return true;
  return false;
}
