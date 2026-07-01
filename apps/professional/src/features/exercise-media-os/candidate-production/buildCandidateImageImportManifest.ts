import type {
  CandidateImageImportManifest,
  CandidateImageImportManifestItem,
  CandidateImageProductionPacket,
} from "./types";

export const CANDIDATE_IMAGE_IMPORT_MANIFEST_VERSION = "candidate-image-import-manifest-v1" as const;

function buildImportItemId(productionPacketId: string): string {
  return `import-item-v1-${productionPacketId}`;
}

function buildManifestItem(
  packet: CandidateImageProductionPacket,
  fileExists: boolean,
  intendedCandidateStatus: "draft" | "dev-test",
): CandidateImageImportManifestItem {
  const importable = fileExists;
  const importNotes: string[] = [
    "Local import manifest only — no upload or persistence.",
    importable
      ? "File metadata marked present — may convert to draft/dev-test candidate."
      : "File not present — not importable.",
    "Never import as approved-master.",
  ];

  return {
    importItemId: buildImportItemId(packet.productionPacketId),
    productionPacketId: packet.productionPacketId,
    exerciseId: packet.exerciseId,
    keyframePoseId: packet.keyframePoseId,
    characterId: packet.characterId,
    renderTarget: packet.renderTarget,
    expectedRepoPath: packet.expectedImport.expectedRepoPath,
    expectedPublicPath: packet.expectedImport.expectedPublicPath,
    fileExists,
    intendedCandidateStatus,
    sourceTool: packet.sourceTool,
    promptVersion: packet.promptPacket.promptVersion,
    importNotes,
  };
}

export type BuildCandidateImageImportManifestInput = {
  readonly packets: readonly CandidateImageProductionPacket[];
  readonly fileExistsByPacketId?: Readonly<Record<string, boolean>>;
  readonly defaultIntendedStatus?: "draft" | "dev-test";
};

/** Build a local import manifest from production packets — no filesystem writes. */
export function buildCandidateImageImportManifest(
  input: BuildCandidateImageImportManifestInput,
): CandidateImageImportManifest {
  const defaultStatus = input.defaultIntendedStatus ?? "draft";
  const items: CandidateImageImportManifestItem[] = input.packets.map((packet) => {
    const fileExists =
      input.fileExistsByPacketId?.[packet.productionPacketId] ??
      packet.expectedImport.localFileExists;
    return buildManifestItem(packet, fileExists, defaultStatus);
  });

  const importableCount = items.filter((item) => item.fileExists).length;
  const blockedCount = items.length - importableCount;

  return {
    manifestId: "candidate-image-import-manifest-v1",
    manifestVersion: CANDIDATE_IMAGE_IMPORT_MANIFEST_VERSION,
    items,
    importableCount,
    blockedCount,
    warnings: [
      "Import manifest does not write files or approve image packs.",
      "Only draft/dev-test candidate status is allowed from import.",
      "approved-master import is not supported.",
    ],
  };
}

export function isImportManifestItemImportable(
  item: CandidateImageImportManifestItem,
): boolean {
  return item.fileExists && item.intendedCandidateStatus !== ("approved-master" as never);
}
