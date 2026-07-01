import { buildBenchPressKeyframeSpec } from "../../keyframe-spec/buildBenchPressKeyframeSpec";
import { buildTop25KeyframeCandidateProductionQueue } from "../../keyframe-spec/buildTop25KeyframeCandidateProductionQueue";
import { buildCandidateImagePromptPacketFromQueueItem } from "../buildCandidateImagePromptPacket";

describe("buildCandidateImagePromptPacket", () => {
  const spec = buildBenchPressKeyframeSpec();
  const queue = buildTop25KeyframeCandidateProductionQueue();
  const benchItem = queue.items.find(
    (item) => item.exerciseId === "bench_press" && item.keyframePoseId === "bottom_chest_pause",
  )!;

  it("builds deterministic prompt packet from queue item", () => {
    const first = buildCandidateImagePromptPacketFromQueueItem(benchItem, spec);
    const second = buildCandidateImagePromptPacketFromQueueItem(benchItem, spec);
    expect(first).toEqual(second);
    expect(first.promptPacketId).toContain("bench_press");
  });

  it("prompt says single still keyframe image", () => {
    const packet = buildCandidateImagePromptPacketFromQueueItem(benchItem, spec);
    expect(packet.fullPromptText.toLowerCase()).toContain("single still keyframe image");
  });

  it("prompt does not contain video/animation/loop language in main instructions", () => {
    const packet = buildCandidateImagePromptPacketFromQueueItem(benchItem, spec);
    const mainText = packet.fullPromptText.split("Negative prompt:")[0] ?? packet.fullPromptText;
    expect(mainText.toLowerCase()).not.toMatch(/\banimate\b/);
    expect(mainText.toLowerCase()).not.toMatch(/\bloop\b/);
    expect(mainText.toLowerCase()).not.toMatch(/\bgenerate a video\b/);
  });

  it("includes characterId and canonical exerciseId", () => {
    const packet = buildCandidateImagePromptPacketFromQueueItem(benchItem, spec);
    expect(packet.characterInstruction).toContain("oli_motion_male_m1");
    expect(packet.sceneInstruction).toContain("bench_press");
    expect(packet.sceneInstruction).toContain("Bench Press");
  });

  it("includes pose, camera, acceptance, and negative criteria", () => {
    const packet = buildCandidateImagePromptPacketFromQueueItem(benchItem, spec);
    expect(packet.poseInstruction).toContain("bottom_chest_pause");
    expect(packet.cameraInstruction).toContain("45");
    expect(packet.acceptanceCriteriaText.length).toBeGreaterThan(0);
    expect(packet.negativePromptText).toMatch(/watermark/i);
    expect(packet.negativePromptText).toMatch(/logo/i);
    expect(packet.negativePromptText).toMatch(/readable text/i);
  });

  it("Bench Press bottom prompt includes chest/sternum touch and pause", () => {
    const packet = buildCandidateImagePromptPacketFromQueueItem(benchItem, spec);
    const haystack = `${packet.poseInstruction} ${packet.acceptanceCriteriaText}`.toLowerCase();
    expect(haystack).toMatch(/chest|sternum/);
    expect(haystack).toMatch(/pause/);
  });
});
