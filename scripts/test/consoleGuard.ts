/**
 * Console discipline guard for Jest.
 *
 * Fails the test suite when console.log, console.error, or console.warn is called unexpectedly.
 * Use allowConsoleForThisTest() or withConsoleSpy() for tests that intentionally
 * trigger or assert on error/warn output (explicit opt-in per test; no global allowlist).
 * console.log: zero tolerance in tests (no opt-in); any console.log fails the suite.
 *
 * Allowed console.error/warn are silenced by default (still recorded for expectConsoleError).
 * To print allowed logs when debugging, set LOG_ALLOWED_CONSOLE=1 before running tests.
 */

type Matcher = RegExp | ((args: unknown[]) => boolean);

function matches(args: unknown[], matcher: Matcher): boolean {
  if (typeof matcher === "function") return matcher(args);
  const text = args.map((a) => (typeof a === "string" ? a : String(a))).join(" ");
  return matcher.test(text);
}

function matchesAny(args: unknown[], matchers: Matcher[] | undefined): boolean {
  if (!matchers?.length) return false;
  return matchers.some((m) => matches(args, m));
}

/**
 * Built-in allowed warn: Firestore emulator Write RPC PERMISSION_DENIED only.
 * Matches only the known SDK/emulator signature: @firebase/firestore logs gRPC
 * Write stream errors with "Code: 7 Message: 7 PERMISSION_DENIED" when rules
 * deny writes (expected during tests). Any other PERMISSION_DENIED message
 * (e.g. from app code) is not allowed and will fail the test.
 */
const FIRESTORE_EMULATOR_WRITE_PERMISSION_DENIED_REGEX =
  /@firebase\/firestore.*GrpcConnection RPC 'Write' stream[\s\S]*?error\.\s*Code:\s*7\s*Message:\s*7\s*PERMISSION_DENIED/;

function isExpectedFirestorePermissionDenied(args: unknown[]): boolean {
  const text = args
    .map((a) => (typeof a === "string" ? a : String(a)))
    .join(" ");
  return FIRESTORE_EMULATOR_WRITE_PERMISSION_DENIED_REGEX.test(text);
}

/** Exported for unit tests that assert the narrow allow behavior. */
export const __testsOnly = {
  FIRESTORE_EMULATOR_WRITE_PERMISSION_DENIED_REGEX,
  isExpectedFirestorePermissionDenied,
};

const DEFAULT_ALLOWED_WARN: Matcher[] = [isExpectedFirestorePermissionDenied];

let originalError: typeof console.error;
let originalWarn: typeof console.warn;
let originalLog: typeof console.log;

const unexpectedErrors: { args: unknown[] }[] = [];
const unexpectedWarns: { args: unknown[] }[] = [];
const unexpectedLogs: { args: unknown[] }[] = [];
/** Allowed errors/warns are still recorded here for expectConsoleError / assertions. */
const recordedAllowedErrors: unknown[][] = [];
const recordedAllowedWarns: unknown[][] = [];

/** Per-test allow list (set by allowConsoleForThisTest). */
let testAllowError: Matcher[] = [];
let testAllowWarn: Matcher[] = [];

/** Stack of allow contexts from withConsoleSpy (inner fn can add more specific allows). */
const spyContextStack: Array<{ allowError: Matcher[]; allowWarn: Matcher[] }> = [];

/** When set to "1", allowed console.error/warn are forwarded to the real console (for debugging). */
const LOG_ALLOWED_CONSOLE = process.env.LOG_ALLOWED_CONSOLE === "1";

function isErrorAllowed(args: unknown[]): boolean {
  if (matchesAny(args, testAllowError)) return true;
  const ctx = spyContextStack[spyContextStack.length - 1];
  if (ctx && matchesAny(args, ctx.allowError)) return true;
  return false;
}

function isWarnAllowed(args: unknown[]): boolean {
  if (matchesAny(args, DEFAULT_ALLOWED_WARN)) return true;
  if (matchesAny(args, testAllowWarn)) return true;
  const ctx = spyContextStack[spyContextStack.length - 1];
  if (ctx && matchesAny(args, ctx.allowWarn)) return true;
  return false;
}

export function installConsoleGuard(): void {
  originalError = console.error.bind(console);
  originalWarn = console.warn.bind(console);
  originalLog = console.log.bind(console);

  console.log = (...args: unknown[]) => {
    unexpectedLogs.push({ args });
    // Do not forward to originalLog; zero console output leakage in tests.
  };

  console.error = (...args: unknown[]) => {
    if (isErrorAllowed(args)) {
      recordedAllowedErrors.push(args);
      if (LOG_ALLOWED_CONSOLE) originalError(...args);
      return;
    }
    unexpectedErrors.push({ args });
    originalError(...args);
  };

  console.warn = (...args: unknown[]) => {
    if (isWarnAllowed(args)) {
      recordedAllowedWarns.push(args);
      if (LOG_ALLOWED_CONSOLE) originalWarn(...args);
      return;
    }
    unexpectedWarns.push({ args });
    originalWarn(...args);
  };
}

export function restoreConsole(): void {
  if (originalLog) console.log = originalLog;
  if (originalError) console.error = originalError;
  if (originalWarn) console.warn = originalWarn;
}

export function clearUnexpected(): void {
  unexpectedErrors.length = 0;
  unexpectedWarns.length = 0;
  unexpectedLogs.length = 0;
  recordedAllowedErrors.length = 0;
  recordedAllowedWarns.length = 0;
  testAllowError = [];
  testAllowWarn = [];
  spyContextStack.length = 0;
}

export function setTestAllow(opts: { error?: Matcher[]; warn?: Matcher[] }): void {
  if (opts.error) testAllowError = [...testAllowError, ...opts.error];
  if (opts.warn) testAllowWarn = [...testAllowWarn, ...opts.warn];
}

export function getUnexpected(): { errors: unknown[][]; warns: unknown[][]; logs: unknown[][] } {
  return {
    errors: unexpectedErrors.map((e) => e.args),
    warns: unexpectedWarns.map((w) => w.args),
    logs: unexpectedLogs.map((l) => l.args),
  };
}

export function failIfUnexpected(): void {
  const { errors, warns, logs } = getUnexpected();
  if (errors.length || warns.length || logs.length) {
    const parts: string[] = [];
    if (logs.length) {
      parts.push(
        `Unexpected console.log (${logs.length}):`,
        ...logs.map((args) => "  " + args.map((a) => String(a)).join(" ")),
      );
    }
    if (errors.length) {
      parts.push(
        `Unexpected console.error (${errors.length}):`,
        ...errors.map((args) => "  " + args.map((a) => String(a)).join(" ")),
      );
    }
    if (warns.length) {
      parts.push(
        `Unexpected console.warn (${warns.length}):`,
        ...warns.map((args) => "  " + args.map((a) => String(a)).join(" ")),
      );
    }
    throw new Error(
      "Console discipline: tests must not call console.log/console.error/console.warn unless explicitly allowed.\n" +
        "console.log is never allowed in tests (zero leakage). For error/warn use allowConsoleForThisTest({ error: [/pattern/], warn: [/pattern/] }) or withConsoleSpy({ allowError, allowWarn }, fn).\n\n" +
        parts.join("\n"),
    );
  }
}

/**
 * Allow console.error and/or console.warn for the current test by pattern.
 * Call at the start of the test (or in beforeEach) for that test only.
 */
export function allowConsoleForThisTest(opts: {
  error?: Matcher[];
  warn?: Matcher[];
}): void {
  setTestAllow(opts);
}

/**
 * Run a callback during which the given error/warn patterns are allowed.
 * Use for tests that intentionally verify error logging.
 */
export async function withConsoleSpy<T>(
  opts: { allow?: Matcher[]; allowError?: Matcher[]; allowWarn?: Matcher[] },
  fn: () => T | Promise<T>,
): Promise<T> {
  const allowError = [...(opts.allow ?? []), ...(opts.allowError ?? [])];
  const allowWarn = [...(opts.allow ?? []), ...(opts.allowWarn ?? [])];
  spyContextStack.push({ allowError, allowWarn });
  try {
    return await fn();
  } finally {
    spyContextStack.pop();
  }
}

/**
 * Run a callback and expect it to call console.error (and optionally match a matcher).
 * Fails if no console.error was called, or if the message doesn't match.
 * Use this for tests that intentionally verify error logging.
 */
export async function expectConsoleError<T>(
  fn: () => T | Promise<T>,
  matcher?: Matcher,
): Promise<T> {
  recordedAllowedErrors.length = 0;
  // Allow all errors during the callback so they are recorded; then we assert below.
  const result = await withConsoleSpy({ allowError: [() => true] }, fn);
  if (recordedAllowedErrors.length === 0) {
    throw new Error(
      "expectConsoleError: expected at least one console.error call, but none occurred.",
    );
  }
  if (matcher && !recordedAllowedErrors.some((args) => matches(args, matcher))) {
    throw new Error(
      "expectConsoleError: console.error was called but did not match the given matcher.\n" +
        "Calls: " +
        recordedAllowedErrors.map((args) => args.map((a) => String(a)).join(" ")).join(" | "),
    );
  }
  return result;
}
