import { mapSignInAuthError } from "@/lib/auth/mapAuthError";
import { signInWithEmail } from "@/lib/auth/actions";

const mockSignInWithEmailAndPassword = jest.fn();
const mockGetFirebaseAuth = jest.fn(() => ({ __brand: "auth" }));

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("@/lib/firebaseConfig", () => ({
  getFirebaseAuth: () => mockGetFirebaseAuth(),
}));

function firebaseError(code: string, message = `Firebase: Error (${code}).`): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

describe("mapSignInAuthError", () => {
  it.each([
    "auth/invalid-credential",
    "auth/wrong-password",
    "auth/user-not-found",
    "auth/invalid-login-credentials",
  ])("maps %s to enumeration-safe credential copy", (code) => {
    const mapped = mapSignInAuthError(firebaseError(code));
    expect(mapped.title).toBe("Sign in failed");
    expect(mapped.message).toBe("The email or password is incorrect.");
    expect(JSON.stringify(mapped)).not.toMatch(/Firebase|auth\/|invalid-credential|wrong-password/i);
  });

  it("does not return raw Firebase error text", () => {
    const mapped = mapSignInAuthError(
      firebaseError("auth/invalid-credential", "Firebase: Error (auth/invalid-credential)."),
    );
    expect(mapped.message).not.toContain("Firebase");
    expect(mapped.message).not.toContain("auth/");
  });
});

describe("signInWithEmail", () => {
  beforeEach(() => {
    mockSignInWithEmailAndPassword.mockReset();
    mockGetFirebaseAuth.mockClear();
  });

  it("trims email and preserves password exactly", async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: {} });
    const result = await signInWithEmail("  person@oli.test  ", "  ExactPass  ");
    expect(result).toEqual({ ok: true });
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      { __brand: "auth" },
      "person@oli.test",
      "  ExactPass  ",
    );
  });

  it("rejects invalid email before network I/O", async () => {
    const result = await signInWithEmail("not-an-email", "password1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("invalid_email");
    expect(mockSignInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it.each([
    "auth/invalid-credential",
    "auth/wrong-password",
    "auth/user-not-found",
    "auth/invalid-login-credentials",
  ])("maps %s without leaking SDK details", async (code) => {
    mockSignInWithEmailAndPassword.mockRejectedValue(
      firebaseError(code, `Firebase: Error (${code}).`),
    );
    const result = await signInWithEmail("person@oli.test", "bad-password");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.title).toBe("Sign in failed");
    expect(result.message).toBe("The email or password is incorrect.");
    expect(JSON.stringify(result)).not.toMatch(/Firebase|auth\/|invalid-credential/i);
  });

  it("maps network failures safely", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue(firebaseError("auth/network-request-failed"));
    const result = await signInWithEmail("person@oli.test", "password1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("network");
    expect(result.message).toMatch(/connection/i);
  });

  it("maps rate-limit failures safely", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue(firebaseError("auth/too-many-requests"));
    const result = await signInWithEmail("person@oli.test", "password1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("too_many_requests");
  });

  it("maps unknown failures without raw error.message", async () => {
    mockSignInWithEmailAndPassword.mockRejectedValue(
      firebaseError("auth/internal-error", "Firebase: Error (auth/internal-error)."),
    );
    const result = await signInWithEmail("person@oli.test", "password1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("unknown");
    expect(result.message).not.toMatch(/Firebase|internal-error|auth\//i);
  });
});
