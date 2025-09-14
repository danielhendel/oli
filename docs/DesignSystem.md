# Oli Design System — Sprint 1

This document explains the **tokens**, **theming**, and **base UI primitives** shipped in Sprint 1. It also defines usage rules to keep the app Apple-quality from day one.

---

## 1) Tokens

**File:** `lib/theme/tokens.ts`

- **Palette:** gray, brand, red, green, yellow, blue (50–900 scales).
- **Spacing:** `xxs, xs, sm, md, lg, xl, 2xl, 3xl` in points.
- **Radii:** `sm, md, lg, xl, full` for rounded corners.
- **Typography:** sizes (`xs`…`2xl`), weights (`regular|medium|bold`), line heights (`tight|snug|normal|relaxed`).

**Theme objects:** `lightTheme`, `darkTheme` expose:
```ts
{
  scheme: "light" | "dark",
  colors: { bg, card, text, textMuted, border, overlay, primary, onPrimary, ... },
  spacing, radii, typography
}
