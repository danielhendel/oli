/**
 * Consumer-facing Labs error copy (Phase 3B).
 * Never surface HTTP status, request IDs, endpoints, or raw backend messages.
 */

export const LABS_CONSUMER_ERROR = {
  title: "Unable to load labs",
  message: "Your lab reports could not be loaded right now.",
  retryLabel: "Try again",
} as const;

export type ConsumerLabsError = {
  title: typeof LABS_CONSUMER_ERROR.title;
  message: typeof LABS_CONSUMER_ERROR.message;
  retryLabel: typeof LABS_CONSUMER_ERROR.retryLabel;
};

/** Map any Labs load failure to stable consumer copy. Internal diagnostics stay out of the return value. */
export function mapLabsLoadErrorToConsumer(_internal?: {
  error?: string | null;
  requestId?: string | null;
  statusCode?: number | null;
}): ConsumerLabsError {
  void _internal;
  return {
    title: LABS_CONSUMER_ERROR.title,
    message: LABS_CONSUMER_ERROR.message,
    retryLabel: LABS_CONSUMER_ERROR.retryLabel,
  };
}

/** Privacy guard: consumer-visible strings must not leak transport/debug metadata. */
export function consumerLabsErrorLeaksInternalDetails(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\bhttp\s*\d{3}\b/i.test(text) ||
    /\brequest\s*id\b/i.test(t) ||
    /\/users\/me\/labs/i.test(t) ||
    /\bfirestore\b/i.test(t) ||
    /\bcloud\s*run\b/i.test(t) ||
    /\binternal_contract_mismatch\b/i.test(t)
  );
}
