import {
  resolvePublicLink,
  PUBLIC_LINK_ENV_KEYS,
  PUBLIC_LINK_LABELS,
} from "@/lib/config/publicLinks";

describe("publicLinks contract", () => {
  it("exposes the Stage 1A environment key names", () => {
    expect(PUBLIC_LINK_ENV_KEYS).toEqual({
      privacyPolicy: "EXPO_PUBLIC_PRIVACY_POLICY_URL",
      termsOfService: "EXPO_PUBLIC_TERMS_OF_SERVICE_URL",
      support: "EXPO_PUBLIC_SUPPORT_URL",
    });
    expect(PUBLIC_LINK_LABELS.privacyPolicy).toBe("Privacy Policy");
    expect(PUBLIC_LINK_LABELS.termsOfService).toBe("Terms of Service");
    expect(PUBLIC_LINK_LABELS.support).toBe("Support");
  });

  it("accepts approved HTTPS URLs", () => {
    expect(resolvePublicLink("https://docs.oli.health/privacy")).toEqual({
      status: "configured",
      url: "https://docs.oli.health/privacy",
    });
  });

  it("treats missing values as explicit unavailable", () => {
    expect(resolvePublicLink(undefined)).toEqual({ status: "unavailable", reason: "missing" });
    expect(resolvePublicLink("")).toEqual({ status: "unavailable", reason: "missing" });
    expect(resolvePublicLink("   ")).toEqual({ status: "unavailable", reason: "missing" });
  });

  it("rejects non-HTTPS schemes", () => {
    expect(resolvePublicLink("http://docs.oli.health/privacy")).toEqual({
      status: "unavailable",
      reason: "invalid_scheme",
    });
    expect(resolvePublicLink("ftp://docs.oli.health/privacy")).toEqual({
      status: "unavailable",
      reason: "invalid_scheme",
    });
    expect(resolvePublicLink("not a url")).toEqual({
      status: "unavailable",
      reason: "invalid_scheme",
    });
  });

  it("rejects localhost and placeholder domains", () => {
    expect(resolvePublicLink("https://localhost/privacy")).toEqual({
      status: "unavailable",
      reason: "localhost",
    });
    expect(resolvePublicLink("https://127.0.0.1/privacy")).toEqual({
      status: "unavailable",
      reason: "localhost",
    });
    expect(resolvePublicLink("https://example.com/privacy")).toEqual({
      status: "unavailable",
      reason: "placeholder",
    });
    expect(resolvePublicLink("https://www.example.org/terms")).toEqual({
      status: "unavailable",
      reason: "placeholder",
    });
  });

  it("does not invent a default fake URL", () => {
    const missing = resolvePublicLink(undefined);
    expect(missing.status).toBe("unavailable");
    expect(missing).not.toEqual(expect.objectContaining({ url: expect.any(String) }));
  });

  it("treats missing development configuration as unavailable without throwing (RG-LEGAL-01)", () => {
    // Missing values must not become a runtime crash or a silent fake destination.
    expect(() => resolvePublicLink(undefined)).not.toThrow();
    expect(resolvePublicLink(undefined)).toEqual({ status: "unavailable", reason: "missing" });
    expect(resolvePublicLink("https://example.com/privacy").status).toBe("unavailable");
  });
});
