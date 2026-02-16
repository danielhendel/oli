// cloudrun/src/validation.ts
import { z } from "zod";

/** Limit provider param to supported values */
export const zProviderParam = z.enum(["oura", "withings"]);

/** /oauth/:provider/start?uid=... */
export const zOAuthStartQuery = z.object({
  uid: z.string().min(1, "uid required"),
});

/** /oauth/:provider/callback?state=...&code=... */
export const zOAuthCallbackQuery = z.object({
  state: z.string().min(1, "state required"),
  code: z.string().min(1, "code required"),
});

/** Oura webhook body (accept unknown keys but require JSON object) */
export const zOuraWebhookPayload = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

/** Generic OAuth token exchange response */
export const zOAuthTokenResponse = z
  .object({
    access_token: z.string(),
    token_type: z.string().optional(),
    refresh_token: z.string().optional(),
    expires_in: z.number().int().nonnegative().optional(),
    scope: z.string().optional(),
    id_token: z.string().optional(),
  })
  .passthrough();
