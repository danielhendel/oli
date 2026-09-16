// lib/onboarding/aboutYouValidation.ts
import { profileSexAtBirthSchema, type ProfileSexAtBirth } from "@oli/contracts";

import { feetInchesToCm } from "@/lib/profile/heightConvert";

import { validateDateOfBirthParts } from "./dateOfBirthParts";
import type { AboutYouDraft, AboutYouFieldErrors } from "./types";

export type AboutYouValidated = {
  preferredName: string;
  dateOfBirth: string;
  sexAtBirth: ProfileSexAtBirth;
  heightCm: number;
  /** Optional weight in kg; null when left blank. */
  weightKg: number | null;
};

function resolveHeightCm(draft: AboutYouDraft): { ok: true; heightCm: number } | { ok: false; error: string } {
  if (draft.lengthUnit === "in") {
    const feet = Number(draft.heightFeet.trim());
    const inches = Number(draft.heightInches.trim() || "0");
    if (!Number.isFinite(feet) || !Number.isFinite(inches) || feet < 0 || inches < 0 || inches >= 12) {
      return { ok: false, error: "Enter a valid height in feet and inches." };
    }
    const cm = feetInchesToCm(feet, inches);
    if (cm < 40 || cm > 280) {
      return { ok: false, error: "Height must be between 40 and 280 cm." };
    }
    return { ok: true, heightCm: cm };
  }

  const cm = Number(draft.heightCm.trim());
  if (!Number.isFinite(cm)) {
    return { ok: false, error: "Enter your height in centimeters." };
  }
  if (cm < 40 || cm > 280) {
    return { ok: false, error: "Height must be between 40 and 280 cm." };
  }
  return { ok: true, heightCm: cm };
}

function resolveOptionalWeightKg(
  draft: AboutYouDraft,
): { ok: true; weightKg: number | null } | { ok: false; error: string } {
  const raw = draft.weightValue.trim();
  if (!raw) return { ok: true, weightKg: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "Enter a valid weight, or leave it blank." };
  }
  const kg = draft.weightUnit === "lb" ? n * 0.45359237 : n;
  if (kg < 20 || kg > 400) {
    return { ok: false, error: "Weight looks out of range." };
  }
  return { ok: true, weightKg: Math.round(kg * 10_000) / 10_000 };
}

export function validateAboutYouDraft(
  draft: AboutYouDraft,
): { ok: true; value: AboutYouValidated } | { ok: false; errors: AboutYouFieldErrors } {
  const errors: AboutYouFieldErrors = {};

  const preferredName = draft.preferredName.trim();
  if (!preferredName) {
    errors.preferredName = "Enter a preferred name.";
  } else if (preferredName.length > 80) {
    errors.preferredName = "Name must be 80 characters or fewer.";
  }

  const dob = validateDateOfBirthParts({
    month: draft.birthMonth,
    day: draft.birthDay,
    year: draft.birthYear,
  });
  if (!dob.ok) {
    errors.dateOfBirth = dob.error;
  }

  const sexParsed = profileSexAtBirthSchema.safeParse(draft.sexAtBirth);
  if (!sexParsed.success) {
    errors.sexAtBirth = "Select sex used for health interpretation.";
  }

  const height = resolveHeightCm(draft);
  if (!height.ok) {
    errors.height = height.error;
  }

  const weight = resolveOptionalWeightKg(draft);
  if (!weight.ok) {
    errors.weight = weight.error;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      preferredName,
      dateOfBirth: dob.ok ? dob.iso : "",
      sexAtBirth: sexParsed.data!,
      heightCm: height.ok ? height.heightCm : 0,
      weightKg: weight.ok ? weight.weightKg : null,
    },
  };
}
