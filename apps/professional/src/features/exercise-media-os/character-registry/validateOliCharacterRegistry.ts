import type {
  CharacterLockStatus,
  CharacterRegistryValidationIssue,
  CharacterRegistryValidationResult,
  OliCharacterRegistry,
  OliMotionCharacter,
} from "./types";

const LOCKED_STATUSES: readonly CharacterLockStatus[] = ["locked", "soft-locked"];

function issue(
  code: string,
  message: string,
  characterId?: OliMotionCharacter["characterId"],
): CharacterRegistryValidationIssue {
  return { code, message, characterId };
}

function requiresLogoTextProhibition(character: OliMotionCharacter): boolean {
  return LOCKED_STATUSES.includes(character.lockStatus);
}

function prohibitsLogosAndText(character: OliMotionCharacter): boolean {
  const haystack = [
    ...character.wardrobe.prohibited,
    ...character.prohibitedElements,
    ...character.brandNotes,
  ]
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("logo") &&
    (haystack.includes("readable text") || haystack.includes("text"))
  );
}

function validateCharacter(character: OliMotionCharacter): CharacterRegistryValidationIssue[] {
  const issues: CharacterRegistryValidationIssue[] = [];
  const { characterId } = character;

  if (!character.displayName.trim()) {
    issues.push(issue("empty-display-name", "displayName must be non-empty", characterId));
  }

  if (!character.version.trim()) {
    issues.push(issue("empty-version", "version must be non-empty", characterId));
  }

  if (character.allowedCameraViews.length === 0) {
    issues.push(
      issue("no-camera-views", "allowedCameraViews must include at least one view", characterId),
    );
  }

  if (character.rights.notes.length === 0) {
    issues.push(issue("no-rights-notes", "rights.notes must be non-empty", characterId));
  }

  if (requiresLogoTextProhibition(character) && character.motionReadinessNotes.length === 0) {
    issues.push(
      issue(
        "no-motion-readiness-notes",
        "locked or soft-locked characters must include motionReadinessNotes",
        characterId,
      ),
    );
  }

  if (requiresLogoTextProhibition(character) && !prohibitsLogosAndText(character)) {
    issues.push(
      issue(
        "missing-logo-text-prohibition",
        "locked or soft-locked characters must prohibit visible logos and readable text",
        characterId,
      ),
    );
  }

  return issues;
}

/** Validate an Oli Character Registry for structural and policy consistency. */
export function validateOliCharacterRegistry(
  registry: OliCharacterRegistry,
): CharacterRegistryValidationResult {
  const issues: CharacterRegistryValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const character of registry.characters) {
    if (seenIds.has(character.characterId)) {
      issues.push(
        issue(
          "duplicate-character-id",
          `Duplicate characterId: ${character.characterId}`,
          character.characterId,
        ),
      );
    }
    seenIds.add(character.characterId);
    issues.push(...validateCharacter(character));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
