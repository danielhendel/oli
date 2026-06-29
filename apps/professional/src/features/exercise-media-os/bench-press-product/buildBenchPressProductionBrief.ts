import {
  BENCH_PRESS_BRIEF_VERSION,
  BENCH_PRESS_PRODUCT_EXERCISE_ID,
  BENCH_PRESS_PRODUCT_VERSION,
} from "./benchPressProductConstants";
import type {
  BenchPressMediaStoryboard,
  BenchPressProductionBrief,
  BenchPressProductionSceneBrief,
  BenchPressStoryboardScene,
  BiomechanicsConstraint,
} from "./types";

const SHARED_NEGATIVE_PROMPT =
  "unsafe form, bouncing bar off chest, extreme elbow flare, unstable wrists, distorted hands, warped barbell, impossible anatomy, exaggerated unsafe arch, messy cluttered gym, misleading muscle highlight, low quality, blurry, shaky camera, text artifacts";

const SHARED_CAMERA =
  "Premium cinematic fitness production. Dark gym aesthetic. Clean background. Soft key light on athlete. No clutter. Stable tripod or smooth gimbal. Professional color grade.";

function criticalConstraint(
  id: string,
  label: string,
  requirement: string,
  failureMode: string,
): BiomechanicsConstraint {
  return { constraintId: id, label, requirement, failureMode, severity: "critical" };
}

function warningConstraint(
  id: string,
  label: string,
  requirement: string,
  failureMode: string,
): BiomechanicsConstraint {
  return { constraintId: id, label, requirement, failureMode, severity: "warning" };
}

function buildSceneBrief(scene: BenchPressStoryboardScene): BenchPressProductionSceneBrief {
  const base = {
    sceneId: scene.sceneId,
    slotType: scene.slotType,
    title: scene.title,
    objective: scene.clientLearningObjective,
    cameraDirection: SHARED_CAMERA,
    audioDirection: "Clean voiceover, minimal music bed, gym ambience subdued.",
    aiNegativePrompt: SHARED_NEGATIVE_PROMPT,
  };

  switch (scene.slotType) {
    case "coachIntro":
      return {
        ...base,
        narrationScript:
          "Welcome to today's bench press session. We'll build confidence in your setup, bar path, and pressing rhythm — so every rep feels strong and controlled.",
        onScreenText: "Today's focus: chest-driven pressing with stable shoulders.",
        shotList: [
          {
            shotId: "intro-1",
            cameraAngle: "Medium close-up",
            framing: "Coach or athlete eye-line, dark gym background",
            movement: "Static",
            durationSeconds: 8,
            purpose: "Establish session intent",
          },
          {
            shotId: "intro-2",
            cameraAngle: "Wide",
            framing: "Empty bench station, bar loaded",
            movement: "Slow push-in",
            durationSeconds: 10,
            purpose: "Preview the movement environment",
          },
        ],
        overlayPlan: [
          {
            overlayId: "intro-text",
            type: "text",
            target: "Lower third",
            description: "Session goal and exercise name",
          },
        ],
        aiGenerationPrompt:
          "Cinematic fitness coach introduction in a dark premium gym. Athlete standing near flat bench press station. Calm confident mood. Soft spotlight. No clutter. 18 second intro clip.",
        biomechanicsConstraints: [],
        acceptanceCriteria: [
          "Narration sets chest-focus intent without medical claims.",
          "On-screen text readable on mobile.",
          "Tone is encouraging and professional.",
        ],
      };
    case "heroDemo":
      return {
        ...base,
        narrationScript:
          "Watch the full bench press pattern: controlled descent, light chest touch, strong drive through the mid-range, and a stable lockout.",
        onScreenText: "Full demonstration · horizontal press · chest + triceps",
        shotList: [
          {
            shotId: "hero-1",
            cameraAngle: "45° front",
            framing: "Full body on bench, bar path visible",
            movement: "Static camera",
            durationSeconds: 20,
            purpose: "Show complete rep at working tempo",
          },
          {
            shotId: "hero-2",
            cameraAngle: "Side",
            framing: "Bar path and elbow angle",
            movement: "Static",
            durationSeconds: 18,
            purpose: "Highlight bar path and shoulder stability",
          },
          {
            shotId: "hero-3",
            cameraAngle: "Close-up",
            framing: "Hands on bar, wrist stack",
            movement: "Static",
            durationSeconds: 14,
            purpose: "Grip and wrist alignment",
          },
        ],
        overlayPlan: [
          {
            overlayId: "hero-muscle",
            type: "muscle-highlight",
            target: "Chest, triceps",
            description: "Subtle activation highlight during concentric",
          },
          {
            overlayId: "hero-path",
            type: "bar-path",
            target: "Barbell",
            description: "Vertical bar path trace on side angle",
          },
        ],
        aiGenerationPrompt:
          "Professional barbell bench press demonstration. Athletic lifter on flat bench. 45-degree front angle and side angle. Controlled full reps. Dark premium gym. Visible bar path. Chest and triceps engaged. Cinematic lighting. No elbow flare.",
        biomechanicsConstraints: [
          criticalConstraint(
            "hero-bar-path",
            "Bar path",
            "Bar travels over lower chest with stacked wrists.",
            "Bar drifts toward face or flares elbows excessively.",
          ),
          criticalConstraint(
            "hero-shoulder",
            "Shoulder stability",
            "Scapulae remain retracted and depressed.",
            "Shoulders roll forward at bottom.",
          ),
        ],
        acceptanceCriteria: [
          "Rep tempo is controlled — no bounce off chest.",
          "Primary muscles match Academy: chest, triceps, shoulders.",
          "Bar path readable on mobile screen.",
        ],
      };
    case "setup":
      return {
        ...base,
        narrationScript:
          "Set your shoulders down and back, find your grip width, plant your feet, and align the bar over your eyes before you unrack.",
        onScreenText: "Setup: shoulders · grip · feet · bar position",
        shotList: [
          {
            shotId: "setup-1",
            cameraAngle: "Overhead",
            framing: "Grip width and bar alignment",
            movement: "Static",
            durationSeconds: 12,
            purpose: "Grip and bar position",
          },
          {
            shotId: "setup-2",
            cameraAngle: "Side low",
            framing: "Foot drive and arch setup",
            movement: "Static",
            durationSeconds: 14,
            purpose: "Leg drive and upper-back tension",
          },
          {
            shotId: "setup-3",
            cameraAngle: "45° front",
            framing: "Full setup sequence",
            movement: "Slow pan",
            durationSeconds: 12,
            purpose: "Complete setup flow",
          },
        ],
        overlayPlan: [
          {
            overlayId: "setup-callout",
            type: "setup-callout",
            target: "Shoulders, feet, grip",
            description: "Sequential callouts for setup checkpoints",
          },
        ],
        aiGenerationPrompt:
          "Bench press setup tutorial. Close shots of grip width, scapular retraction, foot drive on flat bench. Dark gym. Clear instructional framing. Athlete demonstrates stable starting position.",
        biomechanicsConstraints: [
          criticalConstraint(
            "setup-scapula",
            "Scapular position",
            "Shoulders pinned down and back before load.",
            "Loose upper back increases shoulder stress.",
          ),
          warningConstraint(
            "setup-grip",
            "Grip width",
            "Wrists stacked over elbows at bottom.",
            "Wide grip with flared elbows.",
          ),
        ],
        acceptanceCriteria: [
          "All setup checkpoints shown in logical order.",
          "Feet and leg drive visible.",
          "No exaggerated unsafe arch.",
        ],
      };
    case "execution":
      return {
        ...base,
        narrationScript:
          "Own the descent — two to three seconds down, light touch on the chest, then drive the bar up in a straight path while keeping your shoulders stable.",
        onScreenText: "Execution: control down · drive up · stable shoulders",
        shotList: [
          {
            shotId: "exec-1",
            cameraAngle: "Side",
            framing: "Full rep cycle",
            movement: "Static",
            durationSeconds: 25,
            purpose: "Continuous reps at working tempo",
          },
          {
            shotId: "exec-2",
            cameraAngle: "45° front",
            framing: "Mid-range drive",
            movement: "Static",
            durationSeconds: 20,
            purpose: "Concentric intent",
          },
          {
            shotId: "exec-3",
            cameraAngle: "Close-up chest",
            framing: "Touch point",
            movement: "Static",
            durationSeconds: 20,
            purpose: "Bottom position control",
          },
        ],
        overlayPlan: [
          {
            overlayId: "exec-tempo",
            type: "tempo",
            target: "Rep cadence",
            description: "3-1-1 tempo markers on rep",
          },
          {
            overlayId: "exec-path",
            type: "bar-path",
            target: "Barbell",
            description: "Bar path line through full rep",
          },
        ],
        aiGenerationPrompt:
          "Bench press execution coaching clip. Side and 45-degree angles. Controlled eccentric, pause at chest, strong concentric. Visible tempo. Stable shoulders. Dark premium gym. Multiple clean reps.",
        biomechanicsConstraints: [
          criticalConstraint(
            "exec-tempo",
            "Tempo control",
            "Controlled eccentric without bounce.",
            "Bouncing bar off chest.",
          ),
          criticalConstraint(
            "exec-elbow",
            "Elbow angle",
            "Elbows stay roughly 45–75° from torso.",
            "Elbows flare past 90°.",
          ),
        ],
        acceptanceCriteria: [
          "Tempo cues match on-screen markers.",
          "At least two full reps shown clearly.",
          "Shoulders remain stable through set.",
        ],
      };
    case "commonMistake":
      return {
        ...base,
        narrationScript:
          "A common mistake is letting the elbows flare wide and losing upper-back tension. Bring the elbows slightly in and re-set your shoulders before the next rep.",
        onScreenText: "Mistake: elbow flare · Fix: stack and press",
        shotList: [
          {
            shotId: "mistake-1",
            cameraAngle: "45° front",
            framing: "Incorrect elbow flare",
            movement: "Static",
            durationSeconds: 10,
            purpose: "Show the mistake",
          },
          {
            shotId: "mistake-2",
            cameraAngle: "45° front",
            framing: "Corrected rep",
            movement: "Static",
            durationSeconds: 18,
            purpose: "Show the correction",
          },
        ],
        overlayPlan: [
          {
            overlayId: "mistake-callout",
            type: "mistake-callout",
            target: "Elbows",
            description: "Red highlight on flared elbows, green on corrected path",
          },
        ],
        aiGenerationPrompt:
          "Bench press common mistake tutorial. Split screen or sequential: elbow flare error vs corrected form. Dark gym. Clear instructional callouts. Shoulder-friendly elbow angle on correction.",
        biomechanicsConstraints: [
          criticalConstraint(
            "mistake-elbow",
            "Elbow flare",
            "Contrast flared vs stacked elbow path.",
            "Correction still shows unsafe flare.",
          ),
        ],
        acceptanceCriteria: [
          "Mistake and correction both clearly visible.",
          "Coaching language matches Academy common mistakes.",
          "No fear-based or medical diagnosis language.",
        ],
      };
    case "slowMotion":
      return {
        ...base,
        narrationScript:
          "In slow motion, feel the bar touch the chest with control — no bounce — and notice how the bar travels straight up as you drive through the pecs.",
        onScreenText: "Slow motion: feel the bottom · own the path",
        shotList: [
          {
            shotId: "slow-1",
            cameraAngle: "Side",
            framing: "Chest touch at 0.5× speed",
            movement: "Slow motion static",
            durationSeconds: 20,
            purpose: "Bottom position emphasis",
          },
          {
            shotId: "slow-2",
            cameraAngle: "45° front",
            framing: "Drive phase slow motion",
            movement: "Slow motion static",
            durationSeconds: 15,
            purpose: "Concentric path",
          },
        ],
        overlayPlan: [
          {
            overlayId: "slow-path",
            type: "bar-path",
            target: "Barbell",
            description: "Slow-motion bar path trace",
          },
          {
            overlayId: "slow-tempo",
            type: "tempo",
            target: "Bottom pause",
            description: "Pause indicator at chest touch",
          },
        ],
        aiGenerationPrompt:
          "Slow motion bench press rep. Side angle. Controlled chest touch without bounce. Bar path trace overlay. Dark cinematic gym. 0.5x speed feel.",
        biomechanicsConstraints: [
          criticalConstraint(
            "slow-bounce",
            "No bounce",
            "Bar pauses lightly on chest without rebound.",
            "Visible bounce or uncontrolled bottom.",
          ),
          criticalConstraint(
            "slow-path",
            "Bar path",
            "Vertical drive from consistent touch point.",
            "J-shaped drift toward face.",
          ),
        ],
        acceptanceCriteria: [
          "Slow motion reads clearly on mobile.",
          "Bottom position held without bounce.",
          "Bar path overlay aligns with actual movement.",
        ],
      };
    case "muscleOverlay":
      return {
        ...base,
        narrationScript:
          "As you press, the chest drives the movement, the triceps extend the elbows, and the front delts stabilize — feel all three working together.",
        onScreenText: "Muscles: chest · triceps · front delts",
        shotList: [
          {
            shotId: "overlay-1",
            cameraAngle: "45° front",
            framing: "Working rep with overlay",
            movement: "Static",
            durationSeconds: 18,
            purpose: "Muscle highlight on concentric",
          },
          {
            shotId: "overlay-2",
            cameraAngle: "Side",
            framing: "Anatomy overlay on full rep",
            movement: "Static",
            durationSeconds: 14,
            purpose: "Secondary muscle contribution",
          },
        ],
        overlayPlan: [
          {
            overlayId: "overlay-chest",
            type: "muscle-highlight",
            target: "Pectoralis major",
            description: "Primary chest activation during press",
          },
          {
            overlayId: "overlay-triceps",
            type: "muscle-highlight",
            target: "Triceps",
            description: "Elbow extension highlight",
          },
          {
            overlayId: "overlay-delt",
            type: "muscle-highlight",
            target: "Anterior deltoid",
            description: "Stabilizer contribution",
          },
        ],
        aiGenerationPrompt:
          "Bench press with anatomical muscle overlay. Chest triceps and anterior deltoid highlighted during rep. 45-degree angle. Dark gym. Accurate anatomy overlay on athletic lifter.",
        biomechanicsConstraints: [
          warningConstraint(
            "overlay-accuracy",
            "Anatomy accuracy",
            "Muscle highlights match chest, triceps, anterior deltoid.",
            "Misleading or impossible muscle mapping.",
          ),
        ],
        acceptanceCriteria: [
          "Overlay matches Intelligence primary/secondary muscles.",
          "Overlay does not obscure bar path.",
          "Readable on phone-sized screens.",
        ],
      };
    case "reflection":
      return {
        ...base,
        narrationScript:
          "Before your next set, rate your technique: did your shoulders stay stable? Carry one cue — maybe 'drive through the chest' — into every rep.",
        onScreenText: "Reflect: one win · one cue · next set",
        shotList: [
          {
            shotId: "reflect-1",
            cameraAngle: "Medium",
            framing: "Athlete seated after set",
            movement: "Static",
            durationSeconds: 12,
            purpose: "Reflection moment",
          },
          {
            shotId: "reflect-2",
            cameraAngle: "Graphic card",
            framing: "Lesson summary card",
            movement: "Static",
            durationSeconds: 10,
            purpose: "On-screen reflection prompts",
          },
        ],
        overlayPlan: [
          {
            overlayId: "reflect-text",
            type: "text",
            target: "Lesson card",
            description: "Technique rating and cue reminder",
          },
        ],
        aiGenerationPrompt:
          "Calm fitness lesson reflection card after bench press set. Dark premium UI card overlay. Technique rating prompt. Minimal motion. Encouraging tone.",
        biomechanicsConstraints: [],
        acceptanceCriteria: [
          "Reflection prompts are actionable.",
          "No medical stop-if language beyond Academy safety.",
          "Smooth transition to set logging.",
        ],
      };
    default:
      return {
        ...base,
        narrationScript: scene.teachingBeat,
        onScreenText: scene.title,
        shotList: [],
        overlayPlan: [],
        aiGenerationPrompt: `Bench press lesson scene: ${scene.title}. ${scene.visualBeat}. Dark premium gym.`,
        biomechanicsConstraints: [],
        acceptanceCriteria: ["Scene matches storyboard objective."],
      };
  }
}

/** Build AI-ready production brief from a Bench Press media storyboard. */
export function buildBenchPressProductionBrief(
  storyboard: BenchPressMediaStoryboard,
): BenchPressProductionBrief {
  const scenes = storyboard.scenes.map(buildSceneBrief);

  return {
    exerciseId: BENCH_PRESS_PRODUCT_EXERCISE_ID,
    productVersion: BENCH_PRESS_PRODUCT_VERSION,
    briefVersion: BENCH_PRESS_BRIEF_VERSION,
    totalDurationSeconds: storyboard.totalDurationSeconds,
    scenes,
    requiredAssets: scenes.map(
      (scene) => `${scene.slotType}-placeholder-${scene.sceneId}`,
    ),
    aiPromptPack: "bench-press-product-v1-ai-prompt-pack",
    productionNotes: [
      "All assets are placeholder-only in Sprint M5 — no real video URLs.",
      "Premium dark gym aesthetic across all scenes.",
      "Biomechanics constraints are mandatory for hero demo, setup, execution, common mistake, and slow motion.",
      "Captions required for all narration in future production.",
      "Professional approval required before replacing placeholders with real assets.",
    ],
    qaGate: "Expert QA checklist must pass all required checks before asset generation.",
  };
}

export function getProductionSceneBrief(
  brief: BenchPressProductionBrief,
  sceneId: string,
): BenchPressProductionSceneBrief | undefined {
  return brief.scenes.find((scene) => scene.sceneId === sceneId);
}
