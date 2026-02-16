import { buildGoogleAuthorizeUrl, GOOGLE_OIDC_AUTH_ENDPOINT } from "../../lib/auth/google";

describe("buildGoogleAuthorizeUrl", () => {
  test("includes required parameters for id_token implicit flow", () => {
    const url = buildGoogleAuthorizeUrl({
      clientId: "abc123.apps.googleusercontent.com",
      redirectUri: "oli://auth-redirect",
      nonce: "nonceXYZ",
    });

    const u = new URL(url);
    expect(u.origin + u.pathname).toBe(GOOGLE_OIDC_AUTH_ENDPOINT);

    const p = u.searchParams;
    expect(p.get("client_id")).toBe("abc123.apps.googleusercontent.com");
    expect(p.get("redirect_uri")).toBe("oli://auth-redirect");
    expect(p.get("response_type")).toBe("id_token");
    expect(p.get("scope")).toBe("openid email profile");
    expect(p.get("prompt")).toBe("select_account");
    expect(p.get("nonce")).toBe("nonceXYZ");
  });
});
