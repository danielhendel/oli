import { requestPasswordReset } from "@/lib/auth/actions";

const mockSendPasswordResetEmail = jest.fn();
const mockGetFirebaseAuth = jest.fn(() => ({ __brand: "auth" }));

jest.mock("firebase/auth", () => ({
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("@/lib/firebaseConfig", () => ({
  getFirebaseAuth: () => mockGetFirebaseAuth(),
}));

function firebaseError(code: string): Error & { code: string } {
  const err = new Error("firebase-error") as Error & { code: string };
  err.code = code;
  return err;
}

describe("requestPasswordReset", () => {
  beforeEach(() => {
    mockSendPasswordResetEmail.mockReset();
    mockGetFirebaseAuth.mockClear();
  });

  it("trims email input before calling Firebase", async () => {
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
    const result = await requestPasswordReset("  person@oli.test  ");
    expect(result).toEqual({ ok: true });
    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith({ __brand: "auth" }, "person@oli.test");
  });

  it("rejects invalid email before network I/O", async () => {
    const result = await requestPasswordReset("not-an-email");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("invalid_email");
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("maps user-not-found to neutral success (enumeration-safe)", async () => {
    mockSendPasswordResetEmail.mockRejectedValue(firebaseError("auth/user-not-found"));
    const result = await requestPasswordReset("missing@oli.test");
    expect(result).toEqual({ ok: true });
  });

  it("maps network failures safely without leaking Firebase codes", async () => {
    mockSendPasswordResetEmail.mockRejectedValue(firebaseError("auth/network-request-failed"));
    const result = await requestPasswordReset("person@oli.test");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("network");
    expect(JSON.stringify(result)).not.toMatch(/auth\/network-request-failed|firebase/i);
  });

  it("maps too-many-requests safely", async () => {
    mockSendPasswordResetEmail.mockRejectedValue(firebaseError("auth/too-many-requests"));
    const result = await requestPasswordReset("person@oli.test");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("too_many_requests");
    expect(result.message).toMatch(/try again later/i);
  });

  it("maps configuration/operation failures to unavailable without internals", async () => {
    mockSendPasswordResetEmail.mockRejectedValue(firebaseError("auth/operation-not-allowed"));
    const result = await requestPasswordReset("person@oli.test");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("unavailable");
    expect(JSON.stringify(result)).not.toMatch(/operation-not-allowed|Firebase/i);
  });

  it("maps unknown errors to a generic safe failure", async () => {
    mockSendPasswordResetEmail.mockRejectedValue(firebaseError("auth/internal-error"));
    const result = await requestPasswordReset("person@oli.test");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("unknown");
    expect(result.message).not.toMatch(/internal-error|Firebase|person@oli\.test/i);
  });

  it("does not put the email into the returned error payload", async () => {
    mockSendPasswordResetEmail.mockRejectedValue(firebaseError("auth/network-request-failed"));
    const result = await requestPasswordReset("secret.user@oli.test");
    expect(JSON.stringify(result)).not.toContain("secret.user@oli.test");
  });
});
