import {
  OLI_CHARACTER_REGISTRY_VERSION,
  type OliCharacterRegistry,
  type OliMotionCharacter,
} from "./types";

const LOGO_TEXT_PROHIBITIONS = [
  "visible logos",
  "readable text",
  "brand marks",
  "watermarks",
] as const;

const MALE_MOTION_READINESS: readonly string[] = [
  "Realistic athletic adult male trainer physique suitable for hypertrophy demonstrations.",
  "Stable joint positions for horizontal press, squat, hinge, and pull patterns.",
  "Consistent proportions across keyframe sets and future image-to-video generation.",
  "Feet, hands, and barbell contact points must remain anatomically plausible.",
];

const FEMALE_MOTION_READINESS: readonly string[] = [
  "Realistic athletic adult female movement educator physique.",
  "Professional non-sexualized presentation suitable for coaching and demonstration.",
  "Stable joint positions for compound and isolation movement patterns.",
  "Consistent proportions across keyframe sets and future image-to-video generation.",
];

const OLI_MOTION_MALE_M1: OliMotionCharacter = {
  characterId: "oli_motion_male_m1",
  displayName: "Oli Motion Male M1",
  version: "m1-v1",
  reviewStatus: "locked",
  lockStatus: "locked",
  role: "movement-demonstrator",
  presentation: "male",
  bodyType: "athletic adult male, hypertrophy-capable, realistic proportions",
  trainingLook: "premium dark training outfit, motion-ready demonstrator",
  wardrobe: {
    base: "Fitted dark premium training top and shorts or athletic pants — no logos",
    colors: ["black", "charcoal", "dark navy"],
    prohibited: [...LOGO_TEXT_PROHIBITIONS, "neon accents", "competing brand colors"],
  },
  visualStyle: "Premium dark Oli studio aesthetic — cinematic, clean, mobile-readable",
  allowedEnvironments: [
    "oli-dark-studio",
    "premium-dark-gym",
    "controlled-flat-bench-station",
  ],
  allowedCameraViews: [
    "front_45_right",
    "side_right",
    "overhead",
    "mobile_portrait_safe",
  ],
  prohibitedElements: [
    ...LOGO_TEXT_PROHIBITIONS,
    "spotters",
    "crowded gym background",
    "distracting signage",
    "unrealistic muscle exaggeration",
  ],
  motionReadinessNotes: MALE_MOTION_READINESS,
  brandNotes: [
    "Standard male Oli movement character for master exercise media.",
    "Intended anchor for bench press and compound strength keyframe sets.",
    "No visible logos or readable text — AI generation distorts text.",
  ],
  rights: {
    usage: "oli-master-media",
    notes: [
      "Oli-owned master media character — internal production and client delivery only.",
      "Do not license character likeness externally without rights review.",
    ],
  },
  externalToolCharacterNames: {
    googleFlow: "Oli Male Trainer",
  },
};

const OLI_MOTION_FEMALE_F1: OliMotionCharacter = {
  characterId: "oli_motion_female_f1",
  displayName: "Oli Motion Female F1",
  version: "f1-v1",
  reviewStatus: "locked",
  lockStatus: "locked",
  role: "movement-demonstrator",
  presentation: "female",
  bodyType: "athletic adult female, toned, realistic proportions",
  trainingLook: "sleeveless top, all-black leggings, professional movement educator",
  wardrobe: {
    base: "Sleeveless athletic top and all-black leggings — no logos",
    colors: ["black", "charcoal"],
    prohibited: [...LOGO_TEXT_PROHIBITIONS, "revealing costumes", "competing brand colors"],
  },
  visualStyle: "Premium dark Oli studio aesthetic — professional, non-sexualized, mobile-readable",
  allowedEnvironments: [
    "oli-dark-studio",
    "premium-dark-gym",
    "controlled-training-station",
  ],
  allowedCameraViews: [
    "front_45_right",
    "side_right",
    "mobile_portrait_safe",
  ],
  prohibitedElements: [
    ...LOGO_TEXT_PROHIBITIONS,
    "sexualized posing",
    "spotters",
    "crowded gym background",
    "distracting signage",
  ],
  motionReadinessNotes: FEMALE_MOTION_READINESS,
  brandNotes: [
    "Standard female Oli movement character for master exercise media.",
    "Professional movement educator presentation.",
    "No visible logos or readable text — AI generation distorts text.",
  ],
  rights: {
    usage: "oli-master-media",
    notes: [
      "Oli-owned master media character — internal production and client delivery only.",
      "Do not license character likeness externally without rights review.",
    ],
  },
};

/** Local static Oli Motion Character Registry (Sprint M9). */
export const OLI_CHARACTER_REGISTRY: OliCharacterRegistry = {
  version: OLI_CHARACTER_REGISTRY_VERSION,
  characters: [OLI_MOTION_MALE_M1, OLI_MOTION_FEMALE_F1],
};

export function getOliMotionCharacterById(
  characterId: string,
): OliMotionCharacter | undefined {
  return OLI_CHARACTER_REGISTRY.characters.find(
    (character) => character.characterId === characterId,
  );
}

export function isKnownOliCharacterId(characterId: string): characterId is OliMotionCharacter["characterId"] {
  return getOliMotionCharacterById(characterId) !== undefined;
}
