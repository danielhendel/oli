// cloudrun/src/oauth.ts
import { z } from "zod";

/**
 * A normalized token payload we store alongside provider metadata.
 * Optional fields are only set when present (exactOptionalPropertyTypes-safe).
 */
export type TokenSet = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  /** Epoch seconds when the token expires (if provided by provider). */
  expiresAt?: number;
  /** Raw provider response for debugging/forensics. */
  raw?: unknown;
};

const OAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  token_type: z.string().optional(),
  expires_in: z.number().int().positive().optional(),
  scope: z.string().optional(),
});

/**
 * Exchange an OAuth authorization code for tokens using x-www-form-urlencoded.
 */
export async function exchangeOAuthCode(opts: {
  tokenUrl: string;
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<TokenSet> {
  const { tokenUrl, code, redirectUri, clientId, clientSecret } = opts;

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", redirectUri);
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });

  let json: unknown;
  try {
    json = await resp.json();
  } catch {
    const text = await resp.text().catch(() => "");
    throw new Error(`token endpoint non-JSON (${resp.status}): ${text}`);
  }

  if (!resp.ok) {
    throw new Error(`token endpoint error ${resp.status}: ${JSON.stringify(json)}`);
  }

  const parsed = OAuthTokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      "token parse error: " +
        parsed.error.issues.map((i) => `${i.path.join(".")}:${i.message}`).join(", ")
    );
  }

  const { access_token, refresh_token, token_type, expires_in, scope } = parsed.data;
  const nowSec = Math.floor(Date.now() / 1000);

  // Build result without assigning `undefined` to optional fields
  const out: TokenSet = { accessToken: access_token, raw: json };
  if (refresh_token !== undefined) out.refreshToken = refresh_token;
  if (token_type !== undefined) out.tokenType = token_type;
  if (scope !== undefined) out.scope = scope;
  if (typeof expires_in === "number") {
    out.expiresAt = nowSec + Math.max(0, expires_in - 60); // small skew
  }
  return out;
}
