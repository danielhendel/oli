// lib/onboarding/onboardingDraftStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

import { onboardingDraftStorageKey } from "./constants";
import { splitCanonicalDateOfBirth } from "./dateOfBirthParts";
import type { AboutYouDraft } from "./types";

export function emptyAboutYouDraft(): AboutYouDraft {
  return {
    preferredName: "",
    birthMonth: "",
    birthDay: "",
    birthYear: "",
    sexAtBirth: "",
    heightCm: "",
    weightValue: "",
    weightUnit: "kg",
    lengthUnit: "cm",
    heightFeet: "",
    heightInches: "",
  };
}

function migrateLegacyDob(raw: Record<string, unknown>): Pick<
  AboutYouDraft,
  "birthMonth" | "birthDay" | "birthYear"
> {
  if (
    typeof raw.birthMonth === "string" ||
    typeof raw.birthDay === "string" ||
    typeof raw.birthYear === "string"
  ) {
    return {
      birthMonth: typeof raw.birthMonth === "string" ? raw.birthMonth : "",
      birthDay: typeof raw.birthDay === "string" ? raw.birthDay : "",
      birthYear: typeof raw.birthYear === "string" ? raw.birthYear : "",
    };
  }
  if (typeof raw.dateOfBirth === "string" && raw.dateOfBirth.trim()) {
    const parts = splitCanonicalDateOfBirth(raw.dateOfBirth);
    if (parts) {
      return {
        birthMonth: parts.month,
        birthDay: parts.day,
        birthYear: parts.year,
      };
    }
  }
  return { birthMonth: "", birthDay: "", birthYear: "" };
}

function isDraftShape(v: unknown): v is Record<string, unknown> {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.preferredName === "string" && typeof o.heightCm === "string";
}

export async function loadAboutYouDraft(uid: string): Promise<AboutYouDraft> {
  const raw = await AsyncStorage.getItem(onboardingDraftStorageKey(uid));
  if (!raw) return emptyAboutYouDraft();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isDraftShape(parsed)) return emptyAboutYouDraft();
    const dob = migrateLegacyDob(parsed);
    return {
      ...emptyAboutYouDraft(),
      preferredName: typeof parsed.preferredName === "string" ? parsed.preferredName : "",
      ...dob,
      sexAtBirth:
        parsed.sexAtBirth === "" || parsed.sexAtBirth == null
          ? ""
          : (parsed.sexAtBirth as AboutYouDraft["sexAtBirth"]),
      heightCm: typeof parsed.heightCm === "string" ? parsed.heightCm : "",
      weightValue: typeof parsed.weightValue === "string" ? parsed.weightValue : "",
      weightUnit: parsed.weightUnit === "lb" ? "lb" : "kg",
      lengthUnit: parsed.lengthUnit === "in" ? "in" : "cm",
      heightFeet: typeof parsed.heightFeet === "string" ? parsed.heightFeet : "",
      heightInches: typeof parsed.heightInches === "string" ? parsed.heightInches : "",
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
