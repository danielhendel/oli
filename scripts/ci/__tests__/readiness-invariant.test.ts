/**
 * Phase 1 Lock #3 — Unit test proving readiness drift check fails on disallowed values.
 *
 * Tests the same pattern used in scripts/ci/check-invariants.mjs (CHECK 20).
 * No web usage. No flaky IO.
 */

const DISALLOWED = [
  "loading",
  "empty",
  "invalid",
  "not-ready",
  "unknown",
  "unready",
  "pending",
  "coming_soon",
];

const pattern = new RegExp(
  `(?:^|[^\\w])(?:status|state)\\s*:\\s*["'](${DISALLOWED.join("|")})["']`,
  "g",
);

function scanContentForReadinessDrift(content: string): string[] {
  const found: string[] = [];
  let m;
  while ((m = pattern.exec(content)) !== null) {
    found.push(m[1]);
  }
  return found;
}

describe("readiness drift check (Phase 1 Lock #3)", () => {
  it("fails when status uses disallowed value not-ready", () => {
    const content = `const x = { status: "not-ready" };`;
    const found = scanContentForReadinessDrift(content);
    expect(found).toContain("not-ready");
    expect(found.length).toBeGreaterThan(0);
  });

  it("fails when status uses disallowed value loading", () => {
    const content = `const x = { status: "loading" };`;
    const found = scanContentForReadinessDrift(content);
    expect(found).toContain("loading");
  });

  it("fails when status uses disallowed value empty", () => {
    const content = `const x = { status: "empty" };`;
    const found = scanContentForReadinessDrift(content);
    expect(found).toContain("empty");
  });

  it("fails when status uses disallowed value invalid", () => {
    const content = `const x = { status: "invalid" };`;
    const found = scanContentForReadinessDrift(content);
    expect(found).toContain("invalid");
  });

  it("fails when state uses disallowed value coming_soon", () => {
    const content = `const x = { state: "coming_soon" };`;
    const found = scanContentForReadinessDrift(content);
    expect(found).toContain("coming_soon");
  });

  it("passes for canonical status values", () => {
    const content = `
      const a = { status: "ready" };
      const b = { status: "missing" };
      const c = { status: "partial" };
      const d = { status: "error" };
    `;
    const found = scanContentForReadinessDrift(content);
    expect(found).toHaveLength(0);
  });

  it("passes for canonical state values", () => {
    const content = `
      const a = { state: "ready" };
      const b = { state: "missing" };
    `;
    const found = scanContentForReadinessDrift(content);
    expect(found).toHaveLength(0);
  });

  it("does not match network: loading (different vocabulary)", () => {
    const content = `network: "loading"`;
    const found = scanContentForReadinessDrift(content);
    expect(found).toHaveLength(0);
  });
});
