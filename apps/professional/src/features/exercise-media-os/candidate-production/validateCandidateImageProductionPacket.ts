import type { CandidateImageProductionPacket } from "./types";

/** Validate a candidate image production packet for M14 policy compliance. */
export function validateCandidateImageProductionPacket(
  packet: CandidateImageProductionPacket,
): import("./types").CandidateImageProductionPacketValidationResult {
  const issues: import("./types").CandidateImageProductionPacketValidationIssue[] = [];

  if (!packet.productionPacketId.trim()) {
    issues.push({
      code: "empty-production-packet-id",
      severity: "error",
      fieldPath: "productionPacketId",
      message: "productionPacketId must be non-empty",
      productionPacketId: packet.productionPacketId,
    });
  }

  if (!packet.exerciseId.trim()) {
    issues.push({
      code: "empty-exercise-id",
      severity: "error",
      fieldPath: "exerciseId",
      message: "exerciseId must be non-empty",
    });
  }

  if (packet.status === "ready-for-external-generation" && packet.blockedReasons.length > 0) {
    issues.push({
      code: "ready-with-blocked-reasons",
      severity: "error",
      fieldPath: "status",
      message: "ready-for-external-generation packets must not include blockedReasons",
      productionPacketId: packet.productionPacketId,
    });
  }

  if (!packet.promptPacket.fullPromptText.toLowerCase().includes("single still keyframe image")) {
    issues.push({
      code: "missing-still-image-language",
      severity: "error",
      fieldPath: "promptPacket.fullPromptText",
      message: "Prompt must describe a single still keyframe image",
      productionPacketId: packet.productionPacketId,
    });
  }

  return {
    valid: issues.filter((issue) => issue.severity === "error").length === 0,
    issues,
  };
}
