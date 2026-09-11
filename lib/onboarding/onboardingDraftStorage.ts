// lib/onboarding/onboardingDraftStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

import { onboardingDraftStorageKey } from "./constants";
import type { AboutYouDraft } from "./types";

export function emptyAboutYouDraft(): AboutYouDraft {
  return {
    preferredName: "",
    dateOfBirth: "",
    sexAtBirth: "",
    heightCm: "",
    weightValue: "",
    weightUnit: "kg",
    lengthUnit: "cm",
    heightFeet: "",
    heightInches: "",
  };
}

function isDraftShape(v: unknown): v is AboutYouDraft {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.preferredName === "string" &&
    typeof o.dateOfBirth === "string" &&
    typeof o.heightCm === "string" &&
    typeof o.weightValue === "string"
  );
}

export async function loadAboutYouDraft(uid: string): Promise<AboutYouDraft> {
  const raw = await AsyncStorage.getItem(onboardingDraftStorageKey(uid));
  if (!raw) return emptyAboutYouDraft();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isDraftShape(parsed)) return emptyAboutYouDraft();
    return {
      ...emptyAboutYouDraft(),
      ...parsed,
      sexAtBirth: parsed.sexAtBirth === "" || parsed.sexAtBirth == null ? "" : parsed.sexAtBirth,
    };
  } catch {
    return emptyAboutYouDraft();
  }
}

export async function saveAboutYouDraft(uid: string, draft: AboutYouDraft): Promise<void> {
  await AsyncStorage.setItem(onboardingDraftStorageKey(uid), JSON.stringify(draft));
}

export async function clearAboutYouDraft(uid: string): Promise<void> {
  await AsyncStorage.removeItem(onboardingDraftStorageKey(uid));
}
