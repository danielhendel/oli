export const BUILDER_NAV_SECTIONS = [
  "overview",
  "projectedVolume",
  "blocks",
  "library",
  "quality",
  "preview",
  "tools",
] as const;

export type BuilderNavSection = (typeof BUILDER_NAV_SECTIONS)[number];

export const BUILDER_NAV_LABELS: Record<BuilderNavSection, string> = {
  overview: "Overview",
  projectedVolume: "Projected Volume",
  blocks: "Blocks",
  library: "Exercise Library",
  quality: "Workout Quality",
  preview: "Preview",
  tools: "Notes / Tools",
};
