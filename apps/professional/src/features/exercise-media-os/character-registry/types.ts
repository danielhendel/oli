/** Oli Motion Character Registry — local-only types (Sprint M9). */

export const OLI_CHARACTER_REGISTRY_VERSION = "character-registry-v1" as const;

export type OliCharacterRegistryVersion = typeof OLI_CHARACTER_REGISTRY_VERSION;

export type OliCharacterId = "oli_motion_male_m1" | "oli_motion_female_f1";

export type CharacterReviewStatus = "draft" | "dev-test" | "locked" | "retired";

export type CharacterLockStatus = "unlocked" | "soft-locked" | "locked";

export type CharacterRole = "movement-demonstrator" | "coach-presenter";

export type CharacterPresentation = "male" | "female";

export type CharacterCameraView =
  | "front_45_right"
  | "front_45_left"
  | "side_right"
  | "side_left"
  | "overhead"
  | "mobile_portrait_safe";

export type CharacterUsageRights = "internal-dev" | "oli-master-media";

export type OliCharacterWardrobe = {
  readonly base: string;
  readonly colors: readonly string[];
  readonly prohibited: readonly string[];
};

export type OliCharacterRights = {
  readonly usage: CharacterUsageRights;
  readonly notes: readonly string[];
};

export type OliExternalToolCharacterNames = {
  readonly googleFlow?: string;
};

export type OliMotionCharacter = {
  readonly characterId: OliCharacterId;
  readonly displayName: string;
  readonly version: string;
  readonly reviewStatus: CharacterReviewStatus;
  readonly lockStatus: CharacterLockStatus;
  readonly role: CharacterRole;
  readonly presentation: CharacterPresentation;
  readonly bodyType: string;
  readonly trainingLook: string;
  readonly wardrobe: OliCharacterWardrobe;
  readonly visualStyle: string;
  readonly allowedEnvironments: readonly string[];
  readonly allowedCameraViews: readonly CharacterCameraView[];
  readonly prohibitedElements: readonly string[];
  readonly motionReadinessNotes: readonly string[];
  readonly brandNotes: readonly string[];
  readonly rights: OliCharacterRights;
  readonly externalToolCharacterNames?: OliExternalToolCharacterNames;
};

export type OliCharacterRegistry = {
  readonly version: OliCharacterRegistryVersion;
  readonly characters: readonly OliMotionCharacter[];
};

export type CharacterRegistryValidationIssue = {
  readonly code: string;
  readonly message: string;
  readonly characterId?: OliCharacterId;
};

export type CharacterRegistryValidationResult = {
  readonly valid: boolean;
  readonly issues: readonly CharacterRegistryValidationIssue[];
};
