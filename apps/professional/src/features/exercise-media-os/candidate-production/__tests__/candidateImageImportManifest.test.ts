import { buildLiveTop25CandidateImageProductionPackets } from "../buildTop25CandidateImageProductionPackets";
import { buildCandidateImageImportManifest } from "../buildCandidateImageImportManifest";
import { LOCAL_IMPORTED_IMAGE_FIXTURE } from "../fixtures/localImportedImageFixture";

describe("buildCandidateImageImportManifest", () => {
  const livePackets = buildLiveTop25CandidateImageProductionPackets();
  const samplePacket = livePackets.packets[0]!;

  it("manifest item path follows expected public pattern", () => {
    expect(samplePacket.expectedImport.expectedPublicPath).toMatch(
      /^\/media\/exercises\/[^/]+\/keyframes\/[^/]+\.png$/,
    );
    expect(LOCAL_IMPORTED_IMAGE_FIXTURE.expectedPublicPath).toBe(
      "/media/exercises/bench_press/keyframes/setup-16x9.png",
    );
  });

  it("missing file is not importable", () => {
    const manifest = buildCandidateImageImportManifest({ packets: [samplePacket] });
    expect(manifest.importableCount).toBe(0);
    expect(manifest.items[0]?.fileExists).toBe(false);
  });

  it("existing fixture file metadata is importable", () => {
    const manifest = buildCandidateImageImportManifest({
      packets: livePackets.packets.slice(0, 1),
      fileExistsByPacketId: {
        [samplePacket.productionPacketId]: true,
      },
    });
    expect(manifest.importableCount).toBe(1);
  });

  it("intended status is draft or dev-test only", () => {
    const manifest = buildCandidateImageImportManifest({
      packets: [samplePacket],
      defaultIntendedStatus: "draft",
    });
    expect(["draft", "dev-test"]).toContain(manifest.items[0]?.intendedCandidateStatus);
  });

  it("approved-master import status is impossible", () => {
    expect(LOCAL_IMPORTED_IMAGE_FIXTURE.intendedCandidateStatus).not.toBe("approved-master");
    expect(
      buildCandidateImageImportManifest({ packets: [samplePacket] }).warnings.some((warning) =>
        warning.includes("approved-master"),
      ),
    ).toBe(true);
  });

  it("manifest does not write files or approve image packs", () => {
    const manifest = buildCandidateImageImportManifest({ packets: livePackets.packets.slice(0, 3) });
    expect(manifest.warnings.some((warning) => warning.includes("does not write files"))).toBe(true);
  });
});
