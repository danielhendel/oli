/**
 * Unit tests for the console discipline guard and escape hatches.
 */
import {
  __testsOnly,
  allowConsoleForThisTest,
  clearUnexpected,
  expectConsoleError,
  failIfUnexpected,
  getUnexpected,
  withConsoleSpy,
} from "../consoleGuard";

describe("consoleGuard escape hatches", () => {
  it("allowConsoleForThisTest allows matching console.error", async () => {
    allowConsoleForThisTest({ error: [/allowed error/] });
    console.error("allowed error message");
    // afterEach will run failIfUnexpected(); no throw means success
  });

  it("allowConsoleForThisTest allows matching console.warn", async () => {
    allowConsoleForThisTest({ warn: [/allowed warn/] });
    console.warn("allowed warn message");
  });

  it("withConsoleSpy allows error during callback only", async () => {
    await withConsoleSpy({ allowError: [/expected/] }, async () => {
      console.error("expected error");
    });
  });

  it("expectConsoleError passes when console.error is called and matches", async () => {
    await expectConsoleError(
      () => {
        console.error("something failed");
      },
      /something failed/,
    );
  });

  it("expectConsoleError passes when console.error is called with no matcher", async () => {
    await expectConsoleError(() => {
      console.error("any error");
    });
  });

  it("expectConsoleError throws when no console.error is called", async () => {
    await expect(
      expectConsoleError(() => {
        // no console.error
      }),
    ).rejects.toThrow("expected at least one console.error call");
  });

  it("expectConsoleError throws when message does not match matcher", async () => {
    await expect(
      expectConsoleError(
        () => {
          console.error("wrong message");
        },
        /expected pattern/,
      ),
    ).rejects.toThrow("did not match the given matcher");
  });
});

describe("consoleGuard built-in PERMISSION_DENIED allow (narrow)", () => {
  const { isExpectedFirestorePermissionDenied } = __testsOnly;

  it("allows known Firestore emulator Write RPC PERMISSION_DENIED signature", () => {
    const knownEmulatorMessage =
      "[2026-02-10T12:48:06.699Z]  @firebase/firestore: Firestore (12.8.0): GrpcConnection RPC 'Write' stream 0x5a3def5f error. Code: 7 Message: 7 PERMISSION_DENIED: false for 'update' @ L15";
    expect(isExpectedFirestorePermissionDenied([knownEmulatorMessage])).toBe(true);
  });

  it("rejects generic PERMISSION_DENIED message (guard catches unexpected)", () => {
    const genericMessage = "PERMISSION_DENIED: user not allowed to write";
    expect(isExpectedFirestorePermissionDenied([genericMessage])).toBe(false);
  });

  it("rejects PERMISSION_DENIED with @firebase but not Write RPC / Code 7", () => {
    const otherFirestoreMessage =
      "@firebase/firestore: Some other error PERMISSION_DENIED in read";
    expect(isExpectedFirestorePermissionDenied([otherFirestoreMessage])).toBe(false);
  });
});

describe("consoleGuard fails on console.log (zero leakage)", () => {
  it("calling console.log causes failIfUnexpected to throw", () => {
    console.log("any log output");
    expect(getUnexpected().logs.length).toBeGreaterThan(0);
    expect(() => failIfUnexpected()).toThrow("Unexpected console.log");
    clearUnexpected();
  });
});
