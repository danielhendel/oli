/**
 * Centralized public legal/support link contract.
 * Values are public configuration (not secrets). Screens must not parse env directly.
 */

export type PublicLinkKind = "privacyPolicy" | "termsOfService" | "support";

export type PublicLinkUnavailableReason =
  | "missing"
  | "invalid_scheme"
  | "placeholder"
  | "localhost";

export type PublicLinkResolution =
  | { status: "configured"; url: string }
  | { status: "unavailable"; reason: PublicLinkUnavailableReason };

export const PUBLIC_LINK_ENV_KEYS: Readonly<Record<PublicLinkKind, string>> = {
  privacyPolicy: "EXPO_PUBLIC_PRIVACY_POLICY_URL",
  termsOfService: "EXPO_PUBLIC_TERMS_OF_SERVICE_URL",
  support: "EXPO_PUBLIC_SUPPORT_URL",
};

export const PUBLIC_LINK_LABELS: Readonly<Record<PublicLinkKind, string>> = {
  privacyPolicy: "Privacy Policy",
  termsOfService: "Terms of Service",
  support: "Support",
};

const PLACEHOLDER_HOST_MARKERS = ["example.com", "example.org", "example.net"] as const;

function isPlaceholderHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  for (const marker of PLACEHOLDER_HOST_MARKERS) {
    if (host === marker || host === `www.${marker}` || host.endsWith(`.${marker}`)) {
      return true;
    }
  }
  return false;
}

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".localhost");
}

/**
 * Resolve a single public link from an optional raw env string.
 * Staging/production require https and reject localhost/placeholder domains.
 */
export function resolvePublicLink(rawValue: string | undefined): PublicLinkResolution {
  const raw = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!raw) {
    return { status: "unavailable", reason: "missing" };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { status: "unavailable", reason: "invalid_scheme" };
  }

  if (parsed.protocol !== "https:") {
    return { status: "unavailable", reason: "invalid_scheme" };
  }

  if (isLocalHost(parsed.hostname)) {
    return { status: "unavailable", reason: "localhost" };
  }

  if (isPlaceholderHost(parsed.hostname)) {
    return { status: "unavailable", reason: "placeholder" };
  }

  return { status: "configured", url: parsed.toString() };
}

export type PublicLinksSnapshot = Readonly<Record<PublicLinkKind, PublicLinkResolution>>;

/**
 * Read public link configuration once per call site need.
 * Uses static process.env.* reads so EAS Update can inline values.
 */
export function getPublicLinks(): PublicLinksSnapshot {
  return {
    privacyPolicy: resolvePublicLink(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL),
    termsOfService: resolvePublicLink(process.env.EXPO_PUBLIC_TERMS_OF_SERVICE_URL),
    support: resolvePublicLink(process.env.EXPO_PUBLIC_SUPPORT_URL),
  };
}

export function getPublicLink(kind: PublicLinkKind): PublicLinkResolution {
  return getPublicLinks()[kind];
}

export function isPublicLinkConfigured(kind: PublicLinkKind): boolean {
  return getPublicLink(kind).status === "configured";
}
