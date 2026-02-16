// cloudrun/__tests__/state.test.ts
import { makeState, verifyState } from "../src/state";

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64url");

describe("state HMAC signer/verifier", () => {
  const secret = "unit-test-secret";

  test("round-trips uid with correct provider", () => {
    const s = makeState({ uid: "demo", provider: "oura", secret });
    const v = verifyState(s, { provider: "oura", secret });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.uid).toBe("demo");
      expect(typeof v.ts).toBe("number");
      expect(v.ts).toBeGreaterThan(0);
    }
  });

  test("rejects when provider does not match", () => {
    const s = makeState({ uid: "demo", provider: "oura", secret });
    const v = verifyState(s, { provider: "withings", secret });
    expect(v.ok).toBe(false);
  });

  test("rejects tampered payload (uid changed)", () => {
    const s = makeState({ uid: "demo", provider: "oura", secret });
    const parts = s.split(".");
    // format: uidB64.provider.ts.nonce.sigB64
    parts[0] = b64url("other");
    const tampered = parts.join(".");
    const v = verifyState(tampered, { provider: "oura", secret });
    expect(v.ok).toBe(false);
  });
});
