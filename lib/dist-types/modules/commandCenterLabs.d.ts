import type { UploadsPresence } from "@/lib/data/useUploadsPresence";
import type { Readiness } from "../contracts/readiness";
export type ReadinessVocabularyState = Readiness;
export type LabsCommandCenterModel = {
    state: ReadinessVocabularyState;
    title: string;
    description: string;
    latestSummary: string | null;
    showUploadCta: boolean;
    showViewCta: boolean;
    showFailuresCta: boolean;
};
export declare function buildLabsCommandCenterModel(args: {
    dataReadinessState: ReadinessVocabularyState;
    uploads: UploadsPresence | null;
    hasFailures: boolean;
}): LabsCommandCenterModel;
//# sourceMappingURL=commandCenterLabs.d.ts.map