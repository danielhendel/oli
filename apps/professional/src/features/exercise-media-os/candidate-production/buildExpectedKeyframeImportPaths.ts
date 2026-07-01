import type { KeyframeRenderTarget } from "../keyframe-spec/types";
import type { CandidateImageExpectedImport } from "./types";

export function renderTargetToSlug(renderTarget: KeyframeRenderTarget): string {
  return renderTarget.replace(":", "x");
}

export function poseIdToSlug(poseId: string): string {
  return poseId.replace(/_/g, "-");
}

export function buildExpectedKeyframeImportPaths(
  exerciseId: string,
  poseId: string,
  renderTarget: KeyframeRenderTarget,
): Pick<CandidateImageExpectedImport, "expectedFileName" | "expectedPublicPath" | "expectedRepoPath"> {
  const poseSlug = poseIdToSlug(poseId);
  const targetSlug = renderTargetToSlug(renderTarget);
  const expectedFileName = `${poseSlug}-${targetSlug}.png`;
  const expectedPublicPath = `/media/exercises/${exerciseId}/keyframes/${expectedFileName}`;
  const expectedRepoPath = `apps/professional/public/media/exercises/${exerciseId}/keyframes/${expectedFileName}`;

  return { expectedFileName, expectedPublicPath, expectedRepoPath };
}

export function buildExpectedImport(
  exerciseId: string,
  poseId: string,
  renderTarget: KeyframeRenderTarget,
  localFileExists = false,
): CandidateImageExpectedImport {
  const paths = buildExpectedKeyframeImportPaths(exerciseId, poseId, renderTarget);
  return {
    ...paths,
    localFileExists,
  };
}
