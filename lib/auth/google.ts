// lib/auth/google.ts
import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

export type GoogleIdTokenResult = { idToken: string; accessToken?: string | null };

type ClientIds = {
  expoClientId?: string;
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
};

function readClientIds(): ClientIds {
  return {
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  };
}

// --- Public constants (kept for tests/back-compat)
export const GOOGLE_OIDC_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

// --- Test/back-compat URL builder (your unit test imports this)
export type BuildGoogleUrlParams = {
  clientId: string;
  redirectUri: string;
  /** We only support the implicit id_token builder for tests */
  responseType?: "id_token";
  /** space-delimited scopes */
  scope?: string;
  /** Google prompt behavior */
  prompt?: "select_account" | "none" | "consent" | "login";
  /** caller-provided nonce to make tests deterministic */
  nonce: string;
};

export function buildGoogleAuthorizeUrl({
  clientId,
  redirectUri,
  responseType = "id_token",
  scope = "openid email profile",
  prompt = "select_account",
  nonce,
}: BuildGoogleUrlParams): string {
  const qs = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    scope,
    prompt,
    nonce,
  });
  return `${GOOGLE_OIDC_AUTH_ENDPOINT}?${qs.toString()}`;
}

// --- Redirect URI helpers
function makeIosNativeRedirectUri(iosClientId: string) {
  // com.googleusercontent.apps.<CLIENT_ID_WITHOUT_SUFFIX>:/oauthredirect
  const base = iosClientId.replace(".apps.googleusercontent.com", "");
  return AuthSession.makeRedirectUri({ native: `com.googleusercontent.apps.${base}:/oauthredirect` });
}

function makeDefaultRedirectUri() {
  // Respect any app-configured custom scheme/path; otherwise use default
  const schemeRaw = Constants.expoConfig?.scheme as string | string[] | undefined;
  const scheme = Array.isArray(schemeRaw) ? schemeRaw[0] : schemeRaw;
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const explicit = typeof extra["authRedirectUri"] === "string" ? (extra["authRedirectUri"] as string) : undefined;
  return explicit ?? AuthSession.makeRedirectUri({ scheme: scheme ?? "oli", path: "auth-redirect" });
}

/**
 * Launch Google and return an ID token suitable for Firebase.
 * - On native (iOS/Android) with native client ids: Authorization Code + PKCE (token exchange).
 * - On Expo/Web (if Expo/Web client id provided): implicit id_token.
 */
export async function getGoogleIdToken(): Promise<GoogleIdTokenResult> {
  const { expoClientId, webClientId, iosClientId, androidClientId } = readClientIds();

  // ---------- Fallback: implicit (Expo/Web) ----------
  const implicitClient = expoClientId || webClientId;
  if (implicitClient) {
    const redirectUri = AuthSession.makeRedirectUri();
    const discovery = { authorizationEndpoint: GOOGLE_OIDC_AUTH_ENDPOINT } as const;

    const request = await AuthSession.loadAsync(
      {
        clientId: implicitClient,
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
        scopes: ["openid", "email", "profile"],
        extraParams: { prompt: "select_account" },
      },
      discovery
    );

    const result = await request.promptAsync(discovery);
    if (result.type !== "success") {
      throw new Error(`Google auth not successful (type=${result.type})`);
    }
    const idToken = (result.params as Record<string, string> | undefined)?.["id_token"];
    if (!idToken) throw new Error("Google did not return id_token.");
    return { idToken };
  }

  // ---------- Preferred: Authorization Code + PKCE (native) ----------
  const nativeClient =
    Platform.OS === "ios" ? iosClientId : Platform.OS === "android" ? androidClientId : undefined;
  if (!nativeClient) {
    throw new Error(
      "Missing Google client id. Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID."
    );
  }

  const redirectUri =
    Platform.OS === "ios" && iosClientId ? makeIosNativeRedirectUri(iosClientId) : makeDefaultRedirectUri();

  const discovery = {
    authorizationEndpoint: GOOGLE_OIDC_AUTH_ENDPOINT,
    tokenEndpoint: GOOGLE_TOKEN_ENDPOINT,
  } as const;

  // Build a PKCE code request
  const request = await AuthSession.loadAsync(
    {
      clientId: nativeClient,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ["openid", "email", "profile"],
      extraParams: { prompt: "select_account" },
      usePKCE: true,
    },
    discovery
  );

  const result = await request.promptAsync(discovery);
  if (result.type !== "success") {
    throw new Error(`Google auth not successful (type=${result.type})`);
  }
  const code = (result.params as Record<string, string> | undefined)?.["code"];
  if (!code) throw new Error("Google did not return authorization code.");

  // Exchange code -> tokens (PKCE) — typed, no `any`
  const token: AuthSession.TokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId: nativeClient,
      code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier || "" },
    },
    discovery
  );

  // Read from the typed field first; fall back to provider-specific params (typed via unknown)
  const idTokenFromParams =
    (token as unknown as { params?: { id_token?: string } }).params?.id_token ?? null;
  const idToken = token.idToken ?? idTokenFromParams;
  if (!idToken) throw new Error("Google token response did not include id_token.");

  return { idToken, accessToken: token.accessToken ?? null };
}
