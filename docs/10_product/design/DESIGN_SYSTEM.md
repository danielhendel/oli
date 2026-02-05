Oli Design System — Repo Truth (vCurrent)

This document defines the current, enforceable design system for Oli as it exists in the repository today.

It documents:

What is already implemented

What contracts are considered stable

How UI consistency is protected moving forward

How the system will evolve without breaking product velocity

This is not aspirational.
This is the single source of truth for design decisions that affect the codebase.

1. Purpose

The Oli Design System exists to ensure:

A calm, Apple-quality UI across the app

Predictable spacing, color, and typography

A scalable foundation for future features (AI, coaching, insights)

No fragmentation or one-off styling decisions

At the current stage, the system focuses on:

Tokens

Theme contract

A small set of primitives

Clear usage rules

2. Design Tokens

Source of truth:

lib/theme/tokens.ts


Tokens are immutable constants used across the app.

2.1 Color Tokens

Token groups (50–900 scale where applicable):

gray

brand

red

green

yellow

blue

These are raw palette values only.
App code should not consume these directly — they are mapped via the theme.

2.2 Semantic Colors (Theme Layer)

Themes expose semantic color meanings instead of raw colors:

colors: {
  bg,
  card,
  text,
  textMuted,
  border,
  overlay,

  primary,
  onPrimary,

  success,
  warning,
  danger,
  info,
}


This allows:

Dark mode parity

Future re-branding

Accessibility tuning without refactors

2.3 Spacing

Standard spacing scale (points):

xxs, xs, sm, md, lg, xl, 2xl, 3xl


Used for:

Padding

Margin

Gaps

Layout rhythm

2.4 Radii
sm, md, lg, xl, full


Used for:

Cards

Buttons

Inputs

Chips / badges

2.5 Typography Tokens

Typography tokens define scale, not components.

Sizes: xs → 2xl

Weights: regular | medium | bold

Line heights: tight | snug | normal | relaxed

Text components map to these tokens.

3. Theme Contract

Themes define how tokens are applied.

Source of truth:

lib/theme/theme.ts (or equivalent)


Each theme exposes the same contract:

{
  scheme: "light" | "dark",
  colors,
  spacing,
  radii,
  typography,
}

Supported Themes

lightTheme

darkTheme

All UI must work in both themes, even if dark mode polish is still ongoing.

4. UI Primitives (Repo Truth)
4.1 Primitives That Exist Today

These are implemented and stable:

ModuleScreenShell

Standard module layout

Title + optional subtitle

Consistent padding and background

ModuleSectionLinkRow

Navigation rows

Disabled states

Optional badges

These define the current product shell.

4.2 Primitives Planned (Not Yet Implemented)

These are explicitly not done yet:

Button

TextField

Card

Divider

Badge

Global Text wrapper (<T />)

They will be introduced incrementally without breaking existing screens.

5. Usage Rules (Enforced Socially → Technically)
5.1 Current Rules (Effective Immediately)

New screens should prefer existing primitives

Avoid introducing new raw hex colors

Avoid duplicating layout shells

Keep styles minimal and intentional

5.2 Upcoming Enforcement Rules (Planned)

Once migration begins:

❌ No raw hex colors in app/**

❌ No ad-hoc button styles

❌ No custom spacing values outside token scale

✅ All new UI must use primitives or tokens

Lint enforcement will be added in later phases.

6. Migration Plan
Phase 1 — Current (Now)

Tokens and themes exist

Mixed usage of inline styles is allowed

No regressions allowed

Phase 2 — Stabilization

Auth + Settings screens migrate to tokens

Introduce Button + TextField

Remove raw color usage in new code

Phase 3 — Polish

Global typography component

Shadow / elevation tokens

Dark mode parity pass

7. Design Philosophy

Oli UI should feel:

Calm

Clear

Trustworthy

Non-judgmental

Focused on progress, not perfection

No visual noise.
No gamification gimmicks.
No clutter.

Design serves clarity and confidence, not novelty.

8. Source of Truth

This document reflects:

The actual repo state

Current primitives and contracts

The real migration path forward

If code and docs diverge, the code wins, and this document must be updated.

End of Document