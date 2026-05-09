/**
 * Dark-elevated pill chrome per shared overview segment index (Low → Optimal).
 * Order matches {@link MODULE_OVERVIEW_SEGMENT_ZONE_FILLS} and Strength tier indices 0–4.
 */
/** Slightly richer fills + brighter labels for legibility on dark elevated cards (WCAG-minded). */
export const MODULE_OVERVIEW_STRENGTH_TIER_PILL_CHROME = [
  { pillBg: "rgba(255, 110, 118, 0.28)", pillFg: "#FFB3B8" },
  { pillBg: "rgba(255, 210, 115, 0.28)", pillFg: "#FFE08A" },
  { pillBg: "rgba(255, 178, 96, 0.26)", pillFg: "#FFD1A8" },
  { pillBg: "rgba(82, 235, 145, 0.28)", pillFg: "#B8F7CF" },
  { pillBg: "rgba(115, 165, 255, 0.32)", pillFg: "#C9D9FF" },
] as const;
