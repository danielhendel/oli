import { Platform } from "react-native";

export async function getHealthReadStatus(): Promise<"granted" | "denied" | "unknown"> {
  if (Platform.OS !== "ios") return "unknown";
  // Stub: integrate HealthKit in a later sprint. Keep a harmless default for now.
  return "unknown";
}

export async function requestHealthReadPermissions(): Promise<{ granted: boolean; details?: string }> {
  if (Platform.OS !== "ios") return { granted: false, details: "Not available on this device" };
  // Stub: later we’ll request HK permissions. For now, pretend user declined.
  return { granted: false, details: "Health permissions will be requested in the HealthKit sprint." };
}
