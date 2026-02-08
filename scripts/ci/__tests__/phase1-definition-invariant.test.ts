/**
 * CHECK 21 — Unit test proving Phase 1 definition doc invariant.
 *
 * Tests that PHASE_1_DEFINITION.md validation logic:
 * - Fails when route list is missing
 * - Passes when content includes all required items
 *
 * No web usage. No flaky IO.
 */

const API_ROUTES = [
  "/export",
  "/account/delete",
  "/raw-events",
  "/events",
  "/timeline",
  "/lineage",
  "/derived-ledger/snapshot",
  "/derived-ledger/runs",
];

const UI_ROUTES = [
  "app/(app)/(tabs)/_layout.tsx",
  "app/(app)/(tabs)/dash.tsx",
  "app/(app)/(tabs)/timeline/index.tsx",
  "app/(app)/(tabs)/timeline/[day].tsx",
  "app/(app)/(tabs)/manage.tsx",
  "app/(app)/(tabs)/library/index.tsx",
  "app/(app)/(tabs)/library/[category].tsx",
  "app/(app)/(tabs)/stats.tsx",
  "app/(app)/event/[id].tsx",
  "app/(app)/(tabs)/library/lineage/[canonicalEventId].tsx",
  "app/(app)/(tabs)/library/replay/day/[dayKey].tsx",
  "app/(app)/failures/index.tsx",
];

function validatePhase1DefinitionContent(content: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Readiness vocabulary
  const readinessOk =
    /missing\s*\|\s*partial\s*\|\s*ready\s*\|\s*error/.test(content) ||
    [/missing/, /partial/, /ready/, /error/].every((re) => re.test(content));

  if (!readinessOk) {
    errors.push("Missing canonical readiness vocabulary: missing | partial | ready | error");
  }

  // Required API routes section
  if (!/Required API Routes/i.test(content)) {
    errors.push('Missing section header "Required API routes"');
  } else {
    const missingApi = API_ROUTES.filter((r) => !content.includes(r));
    if (missingApi.length) {
      errors.push(`Missing API routes: ${missingApi.join(", ")}`);
    }
  }

  // Required UI routes section
  if (!/Required UI Routes/i.test(content)) {
    errors.push('Missing section header "Required UI routes"');
  } else {
    const missingUi = UI_ROUTES.filter((r) => !content.includes(r));
    if (missingUi.length) {
      errors.push(`Missing UI routes: ${missingUi.join(", ")}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

describe("Phase 1 definition invariant (CHECK 21)", () => {
  it("fails when route list is missing", () => {
    const content = `
# Phase 1 Definition
## Readiness
missing | partial | ready | error
## Required API Routes
- /export
`;
    const result = validatePhase1DefinitionContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("UI routes"))).toBe(true);
  });

  it("fails when API routes section is missing", () => {
    const content = `
# Phase 1 Definition
## Readiness
missing | partial | ready | error
## Required UI Routes
- app/(app)/(tabs)/_layout.tsx
`;
    const result = validatePhase1DefinitionContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("API routes"))).toBe(true);
  });

  it("fails when a required API route is missing from content", () => {
    const content = `
# Phase 1 Definition
## Readiness
missing | partial | ready | error
## Required API Routes
- /export
- /account/delete
- /raw-events
- /events
- /timeline
- /lineage
(no derived-ledger)
## Required UI Routes
${UI_ROUTES.map((r) => `- ${r}`).join("\n")}
`;
    const result = validatePhase1DefinitionContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("derived-ledger"))).toBe(true);
  });

  it("fails when a required UI route is missing from content", () => {
    const content = `
# Phase 1 Definition
## Readiness
missing | partial | ready | error
## Required API Routes
${API_ROUTES.map((r) => `- ${r}`).join("\n")}
## Required UI Routes
- app/(app)/(tabs)/_layout.tsx
- app/(app)/(tabs)/dash.tsx
(missing failures/index.tsx)
`;
    const result = validatePhase1DefinitionContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("failures"))).toBe(true);
  });

  it("fails when readiness vocabulary is missing", () => {
    const content = `
# Phase 1 Definition
## Required API Routes
${API_ROUTES.map((r) => `- ${r}`).join("\n")}
## Required UI Routes
${UI_ROUTES.map((r) => `- ${r}`).join("\n")}
`;
    const result = validatePhase1DefinitionContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("readiness"))).toBe(true);
  });

  it("passes when content includes all required items", () => {
    const content = `
# Phase 1 Definition
## Readiness
- missing
- partial
- ready
- error
## Required API Routes
| Path | Method |
|------|--------|
| /export | POST |
| /account/delete | POST |
| /raw-events | GET |
| /events | GET |
| /timeline | GET |
| /lineage | GET |
| /derived-ledger/snapshot | GET |
| /derived-ledger/runs | GET |
## Required UI Routes
- app/(app)/(tabs)/_layout.tsx
- app/(app)/(tabs)/dash.tsx
- app/(app)/(tabs)/timeline/index.tsx
- app/(app)/(tabs)/timeline/[day].tsx
- app/(app)/(tabs)/manage.tsx
- app/(app)/(tabs)/library/index.tsx
- app/(app)/(tabs)/library/[category].tsx
- app/(app)/(tabs)/stats.tsx
- app/(app)/event/[id].tsx
- app/(app)/(tabs)/library/lineage/[canonicalEventId].tsx
- app/(app)/(tabs)/library/replay/day/[dayKey].tsx
- app/(app)/failures/index.tsx
`;
    const result = validatePhase1DefinitionContent(content);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("passes for readiness inline format (missing | partial | ready | error)", () => {
    const content = `
# Phase 1 Definition
## Readiness
The canonical vocabulary is: missing | partial | ready | error
## Required API Routes
${API_ROUTES.map((r) => `- ${r}`).join("\n")}
## Required UI Routes
${UI_ROUTES.map((r) => `- ${r}`).join("\n")}
`;
    const result = validatePhase1DefinitionContent(content);
    expect(result.valid).toBe(true);
  });
});
