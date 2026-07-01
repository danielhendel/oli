/** Authoritative Bench Press Hero Demo QA criteria — shared by keyframe spec and production QA. */

export const BENCH_PRESS_HERO_DEMO_QA_STANDARD_VERSION = "hero-demo-qa-v1" as const;

export const BENCH_PRESS_HERO_DEMO_ACCEPTANCE_CRITERIA = [
  "Exactly one full rep sequence represented by the pose set — no second rep implied.",
  "Full bench, barbell, plates, and feet visible in master 16:9 review view.",
  "Stable camera framing with clear bar path.",
  "Bar lightly touches lower chest or sternum line at bottom position with brief pause.",
  "Smooth controlled press with wrists stacked over elbows.",
  "Elbows moderate — not extreme flare.",
  "Feet planted throughout the rep.",
  "No bounce off the chest.",
  "Realistic human anatomy and realistic barbell physics.",
  "Consistent Oli Motion Male M1 identity.",
  "Premium dark Oli studio visual style.",
  "Clear and readable on mobile screens.",
  "No visible logos or readable text on wardrobe or equipment.",
  "No watermark.",
] as const;

export const BENCH_PRESS_HERO_DEMO_NEGATIVE_CRITERIA = [
  "Second rep or partial second rep.",
  "Half rep or incomplete range of motion.",
  "Bar not touching chest at bottom.",
  "Bar bouncing off chest.",
  "Bar hovering above chest without contact.",
  "Warped or bent barbell.",
  "Distorted hands or fingers.",
  "Impossible anatomy or joint positions.",
  "Unstable wrists.",
  "Extreme elbow flare.",
  "Missing feet from frame.",
  "Missing plates on barbell.",
  "Cropped or partial bench visible.",
  "Spotter in frame.",
  "Visible logos or brand marks.",
  "Readable text on clothing, equipment, or background.",
  "Watermark or caption burn-in.",
] as const;

export const BENCH_PRESS_KEYFRAME_GLOBAL_NEGATIVE_CRITERIA = [
  ...BENCH_PRESS_HERO_DEMO_NEGATIVE_CRITERIA,
] as const;
