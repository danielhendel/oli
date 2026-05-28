/**
 * Single-flight Oura token refresh per uid.
 *
 * Prevents the previously observed outage where two concurrent refresh attempts
 * raced on Oura's single-use refresh token: one succeeded, the other received
 * invalid_grant, and cleanup nuked custody — even though a valid new token had
 * just been stored.
 */

jest.mock("../../db", () => ({
  db: { runTransaction: jest.fn() },
  FieldValue: { serverTimestamp: () => ({ _serverTimestamp: true }) },
  userCollection: () => ({ doc: () => ({}) }),
}));

jest.mock("../logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("../ouraSecrets", () => ({
  getRefreshToken: jest.fn(),
  setRefreshToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../ouraApi", () => {
  class OuraApiError extends Error {
    code: string;
    status?: number;
    constructor(message: string, code: string, status?: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return {
    refreshOuraAccessToken: jest.fn(),
    OuraApiError,
  };
});

const ouraSecrets = require("../ouraSecrets") as {
  getRefreshToken: jest.Mock;
  setRefreshToken: jest.Mock;
};
const ouraApi = require("../ouraApi") as {
  refreshOuraAccessToken: jest.Mock;
  OuraApiError: new (message: string, code: string, status?: number) => Error & {
    code: string;
    status?: number;
  };
};

const singleFlight = require("../ouraTokenRefreshSingleFlight") as {
  refreshOuraTokenSingleFlight: typeof import("../ouraTokenRefreshSingleFlight").refreshOuraTokenSingleFlight;
  __setLockBackendForTests: (b: import("../ouraTokenRefreshSingleFlight").LockBackend) => void;
  __resetLockBackendForTests: () => void;
};

/** Minimal in-memory lock backend simulating Firestore lease semantics. */
function makeMemoryLockBackend(): import("../ouraTokenRefreshSingleFlight").LockBackend & {
  forceWrite(uid: string, owner: string, expiresAtMs: number): void;
  state: Map<string, { owner: string; expiresAtMs: number }>;
} {
  const state = new Map<string, { owner: string; expiresAtMs: number }>();
  return {
    state,
    forceWrite(uid, owner, expiresAtMs) {
      state.set(uid, { owner, expiresAtMs });
    },
    async acquire({ uid, owner, ttlMs, waitBudgetMs, pollBaseMs }) {
      const start = Date.now();
      while (true) {
        const now = Date.now();
        const current = state.get(uid);
        if (!current || current.expiresAtMs <= now || current.owner === owner) {
          const stolen = !!current && current.expiresAtMs <= now;
          state.set(uid, { owner, expiresAtMs: now + ttlMs });
          return {
            owner,
            stolen,
            async release() {
              const c = state.get(uid);
              if (c?.owner === owner) state.delete(uid);
            },
          };
        }
        const waited = now - start;
        if (waited >= waitBudgetMs) return { acquired: false as const, waitedMs: waited };
        await new Promise((r) => setTimeout(r, pollBaseMs));
      }
    },
  };
}

const cleanupCalls: { uid: string; requestId: string }[] = [];
const cleanupFn = jest.fn(async (uid: string, requestId: string) => {
  cleanupCalls.push({ uid, requestId });
});

let backend: ReturnType<typeof makeMemoryLockBackend>;

beforeEach(() => {
  jest.clearAllMocks();
  cleanupCalls.length = 0;
  backend = makeMemoryLockBackend();
  singleFlight.__setLockBackendForTests(backend);
  ouraSecrets.getRefreshToken.mockResolvedValue("rt_old");
  ouraSecrets.setRefreshToken.mockResolvedValue(undefined);
  ouraApi.refreshOuraAccessToken.mockResolvedValue({
    access_token: "at_new",
    refresh_token: "rt_new",
    expires_in: 86400,
  });
});

afterEach(() => {
  singleFlight.__resetLockBackendForTests();
});

describe("refreshOuraTokenSingleFlight", () => {
  it("two concurrent refresh attempts for same uid only call refreshOuraAccessToken once", async () => {
    let resolveRefresh: ((v: unknown) => void) | null = null;
    const refreshStarted = new Promise<void>((started) => {
      ouraApi.refreshOuraAccessToken.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
            started();
          }),
      );
    });

    const p1 = singleFlight.refreshOuraTokenSingleFlight({
      uid: "u1",
      requestId: "req-a",
      clientId: "cid",
      clientSecret: "csec",
      performReconnectCleanup: cleanupFn,
    });
    const p2 = singleFlight.refreshOuraTokenSingleFlight({
      uid: "u1",
      requestId: "req-b",
      clientId: "cid",
      clientSecret: "csec",
      performReconnectCleanup: cleanupFn,
    });

    await refreshStarted;
    resolveRefresh!({ access_token: "at_new", refresh_token: "rt_new", expires_in: 86400 });

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(ouraApi.refreshOuraAccessToken).toHaveBeenCalledTimes(1);
    expect(r1.kind).toBe("refreshed");
    expect(r2.kind).toBe("refreshed");
    if (r1.kind === "refreshed" && r2.kind === "refreshed") {
      expect(r1.tokens.access_token).toBe("at_new");
      expect(r2.tokens.access_token).toBe("at_new");
    }
  });

  it("second caller waits and reuses the rotated access_token from the winner", async () => {
    const p1 = singleFlight.refreshOuraTokenSingleFlight({
      uid: "u1",
      requestId: "winner",
      clientId: "cid",
      clientSecret: "csec",
      performReconnectCleanup: cleanupFn,
    });
    const p2 = singleFlight.refreshOuraTokenSingleFlight({
      uid: "u1",
      requestId: "follower",
      clientId: "cid",
      clientSecret: "csec",
      performReconnectCleanup: cleanupFn,
    });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(r2);
    expect(ouraApi.refreshOuraAccessToken).toHaveBeenCalledTimes(1);
  });

  it("steals stale lock left behind by a crashed worker", async () => {
    backend.forceWrite("u1", "ghost-owner", Date.now() - 1000);
    const r = await singleFlight.refreshOuraTokenSingleFlight({
      uid: "u1",
      requestId: "req",
      clientId: "cid",
      clientSecret: "csec",
      performReconnectCleanup: cleanupFn,
    });
    expect(r.kind).toBe("refreshed");
    expect(ouraApi.refreshOuraAccessToken).toHaveBeenCalledTimes(1);
  });

  it("releases the lock after a successful refresh", async () => {
    await singleFlight.refreshOuraTokenSingleFlight({
      uid: "u1",
      requestId: "req",
      clientId: "cid",
      clientSecret: "csec",
      performReconnectCleanup: cleanupFn,
    });
    expect(backend.state.has("u1")).toBe(false);
  });

  it("releases the lock when refreshOuraAccessToken throws an unexpected error", async () => {
    ouraApi.refreshOuraAccessToken.mockRejectedValueOnce(new Error("network burst"));
    await expect(
      singleFlight.refreshOuraTokenSingleFlight({
        uid: "u1",
        requestId: "req",
        clientId: "cid",
        clientSecret: "csec",
        performReconnectCleanup: cleanupFn,
      }),
    ).rejects.toThrow("network burst");
    expect(backend.state.has("u1")).toBe(false);
  });

  it("invalid_grant does NOT delete custody when the stored token changed (concurrent winner already rotated)", async () => {
    ouraApi.refreshOuraAccessToken.mockRejectedValueOnce(
      new ouraApi.OuraApiError("invalid_grant", "OURA_TOKEN_REFRESH_FAILED", 401),
    );
    ouraSecrets.getRefreshToken
      .mockResolvedValueOnce("rt_old")
      .mockResolvedValueOnce("rt_already_rotated_by_winner");

    const r = await singleFlight.refreshOuraTokenSingleFlight({
      uid: "u1",
      requestId: "req",
      clientId: "cid",
      clientSecret: "csec",
      performReconnectCleanup: cleanupFn,
    });
    expect(r).toEqual({ kind: "invalid_grant", cleanedUp: false });
    expect(cleanupFn).not.toHaveBeenCalled();
  });

  it("invalid_grant deletes custody when the stored token still equals the attempted token", async () => {
    ouraApi.refreshOuraAccessToken.mockRejectedValueOnce(
      new ouraApi.OuraApiError("invalid_grant", "OURA_TOKEN_REFRESH_FAILED", 401),
    );
    ouraSecrets.getRefreshToken
      .mockResolvedValueOnce("rt_same")
      .mockResolvedValueOnce("rt_same");

    const r = await singleFlight.refreshOuraTokenSingleFlight({
      uid: "u1",
      requestId: "req",
      clientId: "cid",
      clientSecret: "csec",
      performReconnectCleanup: cleanupFn,
    });
    expect(r).toEqual({ kind: "invalid_grant", cleanedUp: true });
    expect(cleanupFn).toHaveBeenCalledTimes(1);
    expect(cleanupCalls[0]).toEqual({ uid: "u1", requestId: "req" });
  });

  it("returns no_refresh_token when custody is missing", async () => {
    ouraSecrets.getRefreshToken.mockResolvedValueOnce(null);
    const r = await singleFlight.refreshOuraTokenSingleFlight({
      uid: "u1",
      requestId: "req",
      clientId: "cid",
      clientSecret: "csec",
      performReconnectCleanup: cleanupFn,
    });
    expect(r).toEqual({ kind: "no_refresh_token" });
    expect(ouraApi.refreshOuraAccessToken).not.toHaveBeenCalled();
    expect(cleanupFn).not.toHaveBeenCalled();
  });

  it("different uids can refresh concurrently without serialization", async () => {
    const p1 = singleFlight.refreshOuraTokenSingleFlight({
      uid: "uA",
      requestId: "req-a",
      clientId: "cid",
      clientSecret: "csec",
      performReconnectCleanup: cleanupFn,
    });
    const p2 = singleFlight.refreshOuraTokenSingleFlight({
      uid: "uB",
      requestId: "req-b",
      clientId: "cid",
      clientSecret: "csec",
      performReconnectCleanup: cleanupFn,
    });
    const [rA, rB] = await Promise.all([p1, p2]);
    expect(rA.kind).toBe("refreshed");
    expect(rB.kind).toBe("refreshed");
    expect(ouraApi.refreshOuraAccessToken).toHaveBeenCalledTimes(2);
  });

  it("returns lock_unavailable when another instance holds the lock past the wait budget", async () => {
    backend.forceWrite("u1", "other-instance", Date.now() + 60_000);
    const r = await singleFlight.refreshOuraTokenSingleFlight(
      {
        uid: "u1",
        requestId: "req",
        clientId: "cid",
        clientSecret: "csec",
        performReconnectCleanup: cleanupFn,
      },
      { waitBudgetMs: 50 },
    );
    expect(r.kind).toBe("lock_unavailable");
    expect(ouraApi.refreshOuraAccessToken).not.toHaveBeenCalled();
    expect(cleanupFn).not.toHaveBeenCalled();
  });

  it("scheduled pull + sleep-day-refresh race: token is NOT revoked when both refresh concurrently", async () => {
    // Both callers start with the same refresh token and try to refresh at once.
    // Only one Oura API call should occur; setRefreshToken is invoked once with the new token;
    // cleanup (which previously revoked custody on the loser) must not run.
    let resolveRefresh: ((v: unknown) => void) | null = null;
    const refreshStarted = new Promise<void>((started) => {
      ouraApi.refreshOuraAccessToken.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
            started();
          }),
      );
    });

    const scheduled = singleFlight.refreshOuraTokenSingleFlight({
      uid: "u1",
      requestId: "scheduler",
      clientId: "cid",
      clientSecret: "csec",
      performReconnectCleanup: cleanupFn,
    });
    const sleepRefresh = singleFlight.refreshOuraTokenSingleFlight({
      uid: "u1",
      requestId: "sleep-day-refresh",
      clientId: "cid",
      clientSecret: "csec",
      performReconnectCleanup: cleanupFn,
    });

    await refreshStarted;
    resolveRefresh!({ access_token: "at_new", refresh_token: "rt_new", expires_in: 86400 });

    const [a, b] = await Promise.all([scheduled, sleepRefresh]);
    expect(a.kind).toBe("refreshed");
    expect(b.kind).toBe("refreshed");
    expect(ouraApi.refreshOuraAccessToken).toHaveBeenCalledTimes(1);
    expect(ouraSecrets.setRefreshToken).toHaveBeenCalledTimes(1);
    expect(ouraSecrets.setRefreshToken).toHaveBeenCalledWith("u1", "rt_new");
    expect(cleanupFn).not.toHaveBeenCalled();
  });
});
