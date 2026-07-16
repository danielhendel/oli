import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";

import { debugRedactedAuthedUrl } from "@/lib/api/http";

describe("debugRedactedAuthedUrl privacy", () => {
  const prevBase = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  const prevKey = process.env.EXPO_PUBLIC_GATEWAY_API_KEY;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_BACKEND_BASE_URL = "https://oli-gateway-cw04f997.uc.gateway.dev";
    process.env.EXPO_PUBLIC_GATEWAY_API_KEY = "test-gateway-key";
  });

  afterEach(() => {
    if (prevBase === undefined) delete process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
    else process.env.EXPO_PUBLIC_BACKEND_BASE_URL = prevBase;
    if (prevKey === undefined) delete process.env.EXPO_PUBLIC_GATEWAY_API_KEY;
    else process.env.EXPO_PUBLIC_GATEWAY_API_KEY = prevKey;
  });

  it("redacts gateway key and day query values from sleep-night URLs", () => {
    const out = debugRedactedAuthedUrl("/users/me/sleep-night?day=2026-07-10");
    expect(out).toContain("key=REDACTED");
    expect(out).toContain("day=REDACTED_DAY");
    expect(out).not.toContain("2026-07-10");
    expect(out).not.toContain("test-gateway-key");
  });
});
