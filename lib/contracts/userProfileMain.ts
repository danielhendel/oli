// lib/contracts/userProfileMain.ts
// Canonical user profile document: Firestore `users/{uid}/profile/main`
import { z } from "zod";

/** ISO calendar date YYYY-MM-DD (local intent; stored as plain string). */
export const profileIsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .refine((s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  }, "Invalid calendar date");

export type ProfileIsoDate = z.infer<typeof profileIsoDateSchema>;

export const profileSexAtBirthSchema = z.enum(["female", "male", "intersex", "unspecified"]);
export type ProfileSexAtBirth = z.infer<typeof profileSexAtBirthSchema>;

export const profileLengthUnitSchema = z.enum(["cm", "in"]);
export type ProfileLengthUnit = z.infer<typeof profileLengthUnitSchema>;

export const profilePrimaryGoalSchema = z.enum([
  "lose_fat",
  "build_muscle",
  "maintain",
  "athletic_performance",
  "general_health",
]);
export type ProfilePrimaryGoal = z.infer<typeof profilePrimaryGoalSchema>;

export const profileWeighInPreferenceSchema = z.enum([
  "morning_fasted",
  "morning",
  "afternoon",
  "evening",
  "anytime",
]);
export type ProfileWeighInPreference = z.infer<typeof profileWeighInPreferenceSchema>;

export const userProfileIdentitySchema = z
  .object({
    firstName: z.string().max(80).nullable(),
    lastName: z.string().max(80).nullable(),
    dateOfBirth: profileIsoDateSchema.nullable(),
    sexAtBirth: profileSexAtBirthSchema.nullable(),
  })
  .strip();

export const userProfileBodySchema = z
  .object({
    /** Standing height stored canonically in centimeters. */
    heightCm: z.number().finite().min(40).max(280).nullable(),
  })
  .strip();

export const userProfileBodyInputsSchema = z
  .object({
    athleteMode: z.boolean(),
    primaryGoal: profilePrimaryGoalSchema.nullable(),
    usualWeighInPreference: profileWeighInPreferenceSchema.nullable(),
    waistCircumferenceCm: z.number().finite().min(30).max(300).nullable(),
    hipCircumferenceCm: z.number().finite().min(30).max(300).nullable(),
    neckCircumferenceCm: z.number().finite().min(25).max(80).nullable(),
  })
  .strip();

/**
 * Display preferences that are not health-ingest truth.
 * Weight display continues to live in `users/{uid}.preferences.units.mass` (GET/PUT /preferences).
 */
export const userProfileAppSchema = z
  .object({
    preferredUnits: z
      .object({
        length: profileLengthUnitSchema,
      })
      .strip(),
  })
  .strip();

export const userProfileMainSchema = z
  .object({
    identity: userProfileIdentitySchema,
    body: userProfileBodySchema,
    bodyInputs: userProfileBodyInputsSchema,
    app: userProfileAppSchema,
  })
  .strip();

export type UserProfileMain = z.infer<typeof userProfileMainSchema>;

// --- PATCH (PUT body) — explicit sections only, no deep arbitrary merge ---

export const userProfileIdentityPatchSchema = z
  .object({
    firstName: z.string().max(80).nullable().optional(),
    lastName: z.string().max(80).nullable().optional(),
    dateOfBirth: profileIsoDateSchema.nullable().optional(),
    sexAtBirth: profileSexAtBirthSchema.nullable().optional(),
  })
  .strip();

export const userProfileBodyPatchSchema = z
  .object({
    heightCm: z.number().finite().min(40).max(280).nullable().optional(),
  })
  .strip();

export const userProfileBodyInputsPatchSchema = z
  .object({
    athleteMode: z.boolean().optional(),
    primaryGoal: profilePrimaryGoalSchema.nullable().optional(),
    usualWeighInPreference: profileWeighInPreferenceSchema.nullable().optional(),
    waistCircumferenceCm: z.number().finite().min(30).max(300).nullable().optional(),
    hipCircumferenceCm: z.number().finite().min(30).max(300).nullable().optional(),
    neckCircumferenceCm: z.number().finite().min(25).max(80).nullable().optional(),
  })
  .strip();

export const userProfileAppPatchSchema = z
  .object({
    preferredUnits: z
      .object({
        length: profileLengthUnitSchema.optional(),
      })
      .strip()
      .optional(),
  })
  .strip();

export const userProfileMainPatchSchema = z
  .object({
    identity: userProfileIdentityPatchSchema.optional(),
    body: userProfileBodyPatchSchema.optional(),
    bodyInputs: userProfileBodyInputsPatchSchema.optional(),
    app: userProfileAppPatchSchema.optional(),
  })
  .strip();

export type UserProfileMainPatch = z.infer<typeof userProfileMainPatchSchema>;

export function defaultUserProfileMain(): UserProfileMain {
  return {
    identity: {
      firstName: null,
      lastName: null,
      dateOfBirth: null,
      sexAtBirth: null,
    },
    body: { heightCm: null },
    bodyInputs: {
      athleteMode: false,
      primaryGoal: null,
      usualWeighInPreference: null,
      waistCircumferenceCm: null,
      hipCircumferenceCm: null,
      neckCircumferenceCm: null,
    },
    app: {
      preferredUnits: { length: "cm" },
    },
  };
}

/** Deterministic server-side merge used by PUT /profile/main after patch validation. */
export function mergeUserProfileMain(base: UserProfileMain, patch: UserProfileMainPatch): UserProfileMain {
  const pi = patch.identity;
  const identity = {
    firstName: pi?.firstName !== undefined ? pi.firstName : base.identity.firstName,
    lastName: pi?.lastName !== undefined ? pi.lastName : base.identity.lastName,
    dateOfBirth: pi?.dateOfBirth !== undefined ? pi.dateOfBirth : base.identity.dateOfBirth,
    sexAtBirth: pi?.sexAtBirth !== undefined ? pi.sexAtBirth : base.identity.sexAtBirth,
  };

  const pb = patch.body;
  const body = {
    heightCm: pb?.heightCm !== undefined ? pb.heightCm : base.body.heightCm,
  };

  const bi = patch.bodyInputs;
  const bodyInputs = {
    athleteMode: bi?.athleteMode !== undefined ? bi.athleteMode : base.bodyInputs.athleteMode,
    primaryGoal: bi?.primaryGoal !== undefined ? bi.primaryGoal : base.bodyInputs.primaryGoal,
    usualWeighInPreference:
      bi?.usualWeighInPreference !== undefined ? bi.usualWeighInPreference : base.bodyInputs.usualWeighInPreference,
    waistCircumferenceCm:
      bi?.waistCircumferenceCm !== undefined ? bi.waistCircumferenceCm : base.bodyInputs.waistCircumferenceCm,
    hipCircumferenceCm:
      bi?.hipCircumferenceCm !== undefined ? bi.hipCircumferenceCm : base.bodyInputs.hipCircumferenceCm,
    neckCircumferenceCm:
      bi?.neckCircumferenceCm !== undefined ? bi.neckCircumferenceCm : base.bodyInputs.neckCircumferenceCm,
  };

  const pl = patch.app?.preferredUnits;
  const app: UserProfileMain["app"] = {
    preferredUnits: {
      length: pl?.length !== undefined ? pl.length : base.app.preferredUnits.length,
    },
  };

  return userProfileMainSchema.parse({ identity, body, bodyInputs, app });
}

/**
 * First persisted `profile/main` document on PUT when Firestore has no doc yet.
 * Applies the validated patch to the contract baseline so the stored object is always a complete `UserProfileMain`.
 * Used only on explicit PUT — never on GET (no implicit persistence).
 */
export function materializeUserProfileMainForPutCreate(patch: UserProfileMainPatch): UserProfileMain {
  return mergeUserProfileMain(defaultUserProfileMain(), patch);
}
