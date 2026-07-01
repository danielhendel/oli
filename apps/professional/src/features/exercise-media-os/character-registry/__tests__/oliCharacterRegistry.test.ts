import {
  OLI_CHARACTER_REGISTRY,
  getOliMotionCharacterById,
  isKnownOliCharacterId,
} from "../oliCharacterRegistry";
import { validateOliCharacterRegistry } from "../validateOliCharacterRegistry";

describe("OLI_CHARACTER_REGISTRY", () => {
  it("contains Oli Motion Male M1", () => {
    const character = getOliMotionCharacterById("oli_motion_male_m1");
    expect(character?.displayName).toBe("Oli Motion Male M1");
    expect(character?.presentation).toBe("male");
  });

  it("contains Oli Motion Female F1", () => {
    const character = getOliMotionCharacterById("oli_motion_female_f1");
    expect(character?.displayName).toBe("Oli Motion Female F1");
    expect(character?.presentation).toBe("female");
  });

  it("has unique character ids", () => {
    const ids = OLI_CHARACTER_REGISTRY.characters.map((character) => character.characterId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["oli_motion_male_m1", "oli_motion_female_f1"]);
  });

  it("locked characters prohibit logos and readable text", () => {
    for (const character of OLI_CHARACTER_REGISTRY.characters) {
      if (character.lockStatus !== "locked" && character.lockStatus !== "soft-locked") {
        continue;
      }
      const prohibited = [
        ...character.wardrobe.prohibited,
        ...character.prohibitedElements,
        ...character.brandNotes,
      ]
        .join(" ")
        .toLowerCase();
      expect(prohibited).toContain("visible logos");
      expect(prohibited).toContain("readable text");
    }
  });

  it("every character has rights notes", () => {
    for (const character of OLI_CHARACTER_REGISTRY.characters) {
      expect(character.rights.notes.length).toBeGreaterThan(0);
    }
  });

  it("every character has motion readiness notes", () => {
    for (const character of OLI_CHARACTER_REGISTRY.characters) {
      expect(character.motionReadinessNotes.length).toBeGreaterThan(0);
    }
  });

  it("every character has at least one allowed camera view", () => {
    for (const character of OLI_CHARACTER_REGISTRY.characters) {
      expect(character.allowedCameraViews.length).toBeGreaterThan(0);
    }
  });

  it("isKnownOliCharacterId narrows known ids", () => {
    expect(isKnownOliCharacterId("oli_motion_male_m1")).toBe(true);
    expect(isKnownOliCharacterId("unknown_character")).toBe(false);
  });
});

describe("validateOliCharacterRegistry", () => {
  it("returns no errors for seed registry", () => {
    const result = validateOliCharacterRegistry(OLI_CHARACTER_REGISTRY);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
