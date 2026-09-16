// lib/onboarding/mapOnboardingError.ts
export type ConsumerOnboardingError = {
  title: string;
  message: string;
};

/**
 * Map unknown failures to safe, non-technical consumer copy.
 * Never surfaces tokens, stack traces, or raw HTTP bodies.
 */
export function mapOnboardingError(err: unknown): ConsumerOnboardingError {
  if (err && typeof err === "object") {
    const o = err as { kind?: string; code?: string; message?: string; status?: number };
    const kind = (o.kind ?? o.code ?? "").toLowerCase();
    if (kind.includes("network") || o.status === 0) {
      return {
        title: "Connection issue",
        message: "Check your connection and try again.",
      };
    }
    if (kind.includes("unauthorized") || o.status === 401) {
      return {
        title: "Sign in required",
        message: "Please sign in again to continue.",
      };
    }
    if (kind.includes("deletion")) {
      return {
        title: "Account deletion pending",
        message: "This account is being deleted. Onboarding isn’t available.",
      };
    }
  }

  return {
    title: "Something went wrong",
    message: "Please try again in a moment.",
  };
}
