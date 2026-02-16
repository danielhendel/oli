import AsyncStorage from "@react-native-async-storage/async-storage";

export type UnitSystem = "metric" | "imperial";

export type Profile = {
  id: string;                // local user id (stub for now)
  displayName?: string;
  unitSystem: UnitSystem;
  birthdayIso?: string;      // YYYY-MM-DD
  heightCm?: number;
  weightKg?: number;
};

const STORAGE_KEY = "profile.v1";

export function makeDefaultProfile(id = "local-user"): Profile {
  return {
    id,
    unitSystem: "metric",
  };
}

export async function loadProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (isProfile(parsed)) return parsed;
  } catch {
    // ignore corrupt storage
  }
  return null;
}

export async function saveProfile(p: Profile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export async function clearProfile(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function makeMockProfile(id = "local-user"): Profile {
  return {
    id,
    displayName: "Oli Tester",
    unitSystem: "metric",
    birthdayIso: "1990-01-01",
    heightCm: 180,
    weightKg: 75,
  };
}

// ---------- tiny runtime validator (keeps types honest without zod) ----------
function isProfile(v: unknown): v is Profile {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string") return false;
  if (o.displayName !== undefined && typeof o.displayName !== "string") return false;
  if (o.unitSystem !== "metric" && o.unitSystem !== "imperial") return false;
  if (o.birthdayIso !== undefined && typeof o.birthdayIso !== "string") return false;
  if (o.heightCm !== undefined && typeof o.heightCm !== "number") return false;
  if (o.weightKg !== undefined && typeof o.weightKg !== "number") return false;
  return true;
}
