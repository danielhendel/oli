# Oli Google Flow Prompt Packet Standard v1

**Status:** Authoritative for Google Flow keyframe prompt packets  
**Version:** google-flow-prompt-packet-v1

---

## Prompt packet structure

Each `GoogleFlowPromptPacket` includes:
- `characterInstruction` — locked Oli character identity
- `sceneInstruction` — single still keyframe image context
- `poseInstruction` — pose-specific coaching and visibility
- `cameraInstruction` — required view (e.g. front 45-degree right)
- `renderTargetInstruction` — 16:9 / 9:16 / 1:1 framing
- `wardrobeInstruction` — no logos or readable text
- `environmentInstruction` — premium dark Oli studio
- `acceptanceCriteriaText` — pose and QA acceptance
- `negativePromptText` — failures, watermark, video language exclusions
- `fullPromptText` — deterministic concatenation for external use

---

## Image language standard

Required phrases:
- "Create a single still keyframe image"
- "Do not show motion blur"
- "Do not show multiple phases of the lift in one image"
- "Do not include captions or text overlays"

Forbidden in main instructions:
- "Generate a video"
- "Animate"
- "Loop"

---

## Bench Press examples (M9 poses)

| Pose | Key instructions |
|------|------------------|
| setup | Stable shoulder/foot position; full bench, barbell, plates, feet visible |
| start_lockout | Locked elbows; wrists stacked; one rep start |
| bottom_chest_pause | Bar touches lower chest/sternum; brief pause; no bounce |
| finish_lockout | Confident lockout; bar path over lower chest |

All Bench Press packets use `oli_motion_male_m1`, premium dark Oli studio, no watermark/logos/readable text.

---

## Google Flow character mapping

External Google Flow generation is **manual** — no API integration.

| Registry field | Value |
| --- | --- |
| `characterId` | `oli_motion_male_m1` |
| Registry `displayName` | `Oli Motion Male M1` |
| `externalToolCharacterNames.googleFlow` | `Oli Male Trainer` |

Prompt packets must include **both**:

1. **External tool instruction:** `Use Google Flow character: Oli Male Trainer.`
2. **Internal traceability:** `Character registry ID: oli_motion_male_m1.`

Operators select **Oli Male Trainer** in the Google Flow UI. The repo preserves canonical `characterId` for import manifests, candidates, and image packs.

---

## Negative prompt standard

Include:
- warped barbell / distorted hands
- watermark, logos, readable text
- second rep / bounce (bench press)
- video / animation / loop / motion blur (as negatives)

---

## Rights/watermark warning

Prompt packets instruct generators to avoid watermarks and readable text.

Rights clearance happens in M10 candidate review — not at prompt generation time.
