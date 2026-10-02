/**
 * Format waist circumference for display (canonical cm → in/cm preference).
 */
import { cmToInches } from "@/lib/body/waistProtocol";
import type { WaistLengthDisplayUnit } from "@/lib/body/presentation/bodyMetricManualEntryValidation";

export function formatWaistCircumference(
  waistCm: number,
  unit: WaistLengthDisplayUnit,
): string {
  if (!Number.isFinite(waistCm)) return "—";
  if (unit === "in") {
    const inches = cmToInches(waistCm);
    const one = inches.toFixed(1);
    return one.endsWith(".0") ? `${one.slice(0, -2)} in` : `${one} in`;
  }
  const one = waistCm.toFixed(1);
  return one.endsWith(".0") ? `${one.slice(0, -2)} cm` : `${one} cm`;
}

export function formatWaistCircumferenceChange(
  deltaCm: number,
  unit: WaistLengthDisplayUnit,
): string {
  if (!Number.isFinite(deltaCm)) return "—";
  const mag =
    unit === "in"
      ? `${Math.abs(cmToInches(deltaCm)).toFixed(1)} in`
      : `${Math.abs(deltaCm).toFixed(1)} cm`;
  if (deltaCm > 0) return `+${mag}`;
  if (deltaCm < 0) return `−${mag}`;
  return mag;
}

export function formatWaistMeasuredAtLabel(observedAtIso: string): string {
  const d = new Date(observedAtIso);
  if (Number.isNaN(d.getTime())) return observedAtIso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
