/**
 * User-facing copy for nutrition overview fetches. Never show raw HTTP status lines to end users.
 */
export function friendlyNutritionOverviewErrorMessage(message: string): string {
  const m = message.trim().toLowerCase();
  if (m.length === 0) return "We couldn’t load this. Please try again.";
  if (m.includes("invalid query") || m.includes("400") || m.includes("bad request")) {
    return "We couldn’t load this. Pull to refresh or try again in a moment.";
  }
  if (m.includes("not signed in") || m.includes("unauthorized") || m.includes("401")) {
    return "Sign in to load your nutrition data.";
  }
  if (m.includes("network") || m.includes("fetch") || m.includes("failed to")) {
    return "Check your connection and try again.";
  }
  if (m.includes("timeout")) {
    return "This is taking too long. Try again.";
  }
  return "We couldn’t load this. Please try again.";
}
