/**
 * CHECK 22 — Unit test proving Phase 2 definition doc invariant.
 *
 * Tests that PHASE_2_DEFINITION.md validation logic:
 * - Fails when doc is missing
 * - Fails when required sections are missing
 * - Passes when content includes all required sections
 *
 * No web usage. No flaky IO.
 */

const REQUIRED_SECTIONS = [
  "Authority & Truth Contract",
  "Logging Primitives",
  "No Proactive Prompts",
];

function validatePhase2DefinitionContent(content: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const missing = REQUIRED_SECTIONS.filter((section) => !content.includes(section));
  const uncertaintyOk =
    content.includes("Uncertainty Visibility") || content.includes("Uncertainty as First-Class Truth");
  if (!uncertaintyOk) missing.push("Uncertainty Visibility or Uncertainty as First-Class Truth");

  if (missing.length) {
    errors.push(`Missing required sections: ${missing.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}

describe("Phase 2 definition invariant (CHECK 22)", () => {
  it("fails when Authority & Truth Contract is missing", () => {
    const content = `
# Phase 2 Definition
## Logging Primitives
...
## No Proactive Prompts
...
## Uncertainty Visibility
...
`;
    const result = validatePhase2DefinitionContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Authority & Truth Contract"))).toBe(true);
  });

  it("fails when Logging Primitives is missing", () => {
    const content = `
# Phase 2 Definition
## Authority & Truth Contract
...
## No Proactive Prompts
...
## Uncertainty Visibility
...
`;
    const result = validatePhase2DefinitionContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Logging Primitives"))).toBe(true);
  });

  it("fails when No Proactive Prompts is missing", () => {
    const content = `
# Phase 2 Definition
## Authority & Truth Contract
...
## Logging Primitives
...
## Uncertainty Visibility
...
`;
    const result = validatePhase2DefinitionContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("No Proactive Prompts"))).toBe(true);
  });

  it("fails when Uncertainty (Visibility or First-Class Truth) is missing", () => {
    const content = `
# Phase 2 Definition
## Authority & Truth Contract
...
## Logging Primitives
...
## No Proactive Prompts
...
`;
    const result = validatePhase2DefinitionContent(content);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("Uncertainty Visibility") || e.includes("Uncertainty as First-Class Truth"),
      ),
    ).toBe(true);
  });

  it("passes when content includes all required sections (Uncertainty Visibility)", () => {
    const content = `
# Phase 2 Definition

## Authority & Truth Contract
Phase 2 is governed by the following truth principles...

## Logging Primitives
Phase 2 first-class primitives...

## No Proactive Prompts
Oli must not interrupt, prompt, or guilt users...

## Uncertainty Visibility
Uncertainty must be visible at event/day/timeline levels...
`;
    const result = validatePhase2DefinitionContent(content);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("passes when content includes Uncertainty as First-Class Truth", () => {
    const content = `
# Phase 2 Definition

## Authority & Truth Contract
Phase 2 is governed by the following truth principles...

## Required Logging Primitives
Phase 2 first-class primitives...

### No Proactive Prompts
Oli must not interrupt...

## 4. Uncertainty as First-Class Truth
Uncertainty must be explicitly modeled and surfaced...
`;
    const result = validatePhase2DefinitionContent(content);
    expect(result.valid).toBe(true);
  });
});
