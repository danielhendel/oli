import type { OuraRatingLabel } from "@/lib/format/ouraScore";

/**
 * Pill chrome aligned with Strength overview tiers (Low → Optimal chroma) for Oura-style labels.
 */
export function ouraRatingLabelToPillColors(label: OuraRatingLabel): {
  color: string;
  backgroundColor: string;
} {
  switch (label) {
    case "Pay attention":
      return { color: "#E57373", backgroundColor: "#FDF5F5" };
    case "Fair":
      return { color: "#E6A15C", backgroundColor: "#FFFAF4" };
    case "Good":
      return { color: "#5EC08C", backgroundColor: "#F0F8F4" };
    case "Optimal":
      return { color: "#5C8FE6", backgroundColor: "#F2F6FC" };
    default: {
      const _x: never = label;
      return _x;
    }
  }
}
