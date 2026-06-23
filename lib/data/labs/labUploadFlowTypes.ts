// lib/data/labs/labUploadFlowTypes.ts
export type LabUploadFlowPhase =
  | "idle"
  | "picking"
  | "uploading"
  | "processing"
  | "success"
  | "error";

export type LabUploadFlowState = {
  phase: LabUploadFlowPhase;
  uploadId: string | null;
  error: string | null;
  fileName: string | null;
};

export const LAB_UPLOAD_FLOW_INITIAL: LabUploadFlowState = {
  phase: "idle",
  uploadId: null,
  error: null,
  fileName: null,
};
