/**
 * Document ingestion orchestration (server).
 * Fail-closed when no real parser exists. Never logs file contents or health values.
 */

import { randomUUID } from "crypto";
import type {
  DocumentExtractionResult,
  DocumentIngestionJob,
  DocumentIngestionJobState,
  UserDocumentRecord,
} from "@oli/contracts";
import { DOCUMENT_SCHEMA_VERSION } from "@oli/contracts";
import { classifyDocument } from "../../../../../lib/data/documents/documentClassification";
import { validateExtractionEnvelope } from "../../../../../lib/data/documents/documentExtraction";
import {
  documentRecordStatusFromJobState,
  transitionDocumentIngestionJobState,
} from "../../../../../lib/data/documents/documentStateMachine";
import { resolveDocumentParser } from "./documentParsers";

type DocRef = {
  get: () => Promise<{ exists: boolean; data: () => unknown }>;
  set: (data: unknown, opts?: { merge?: boolean }) => Promise<unknown>;
  update: (data: unknown) => Promise<unknown>;
  delete: () => Promise<unknown>;
};

type Col = {
  doc: (id?: string) => DocRef;
  where: (field: string, op: string, value: unknown) => {
    limit: (n: number) => { get: () => Promise<{ docs: { id: string; data: () => unknown }[] }> };
    get: () => Promise<{ docs: { id: string; data: () => unknown }[] }>;
  };
};

export type DocumentIngestionDeps = {
  documentsCol: Col;
  jobsCol: Col;
  extractionsCol: Col;
  now?: () => string;
};

function appendHistory(
  job: DocumentIngestionJob,
  state: DocumentIngestionJobState,
  at: string,
): DocumentIngestionJob["stateHistory"] {
  return [...(job.stateHistory ?? []), { state, at }];
}

async function transitionJob(
  jobsCol: Col,
  job: DocumentIngestionJob,
  to: DocumentIngestionJobState,
  now: string,
  patch?: Partial<DocumentIngestionJob>,
): Promise<DocumentIngestionJob> {
  const result = transitionDocumentIngestionJobState(job.state, to);
  if (!result.ok && result.reason === "invalid_transition") {
    throw new Error(`Invalid job transition ${job.state} -> ${to}`);
  }
  if (!result.ok && result.reason === "idempotent_noop") {
    return job;
  }
  const next: DocumentIngestionJob = {
    ...job,
    ...patch,
    state: to,
    updatedAt: now,
    stateHistory: appendHistory(job, to, now),
  };
  await jobsCol.doc(job.id).set(next, { merge: true });
  return next;
}

async function updateDocumentStatus(
  documentsCol: Col,
  documentId: string,
  status: UserDocumentRecord["status"],
  now: string,
  patch?: Partial<UserDocumentRecord>,
): Promise<void> {
  await documentsCol.doc(documentId).update({
    status,
    updatedAt: now,
    ...patch,
  });
}

/**
 * Run classification + extraction for a stored document.
 * Marks extraction_unsupported when parsers are stubs.
 */
export async function runDocumentIngestionJob(args: {
  deps: DocumentIngestionDeps;
  uid: string;
  document: UserDocumentRecord;
  job: DocumentIngestionJob;
  parserId?: string;
}): Promise<{ job: DocumentIngestionJob; extraction: DocumentExtractionResult | null }> {
  const nowFn = args.deps.now ?? (() => new Date().toISOString());
  let job = args.job;
  const { documentsCol, jobsCol, extractionsCol } = args.deps;

  try {
    job = await transitionJob(jobsCol, job, "classifying", nowFn());
    await updateDocumentStatus(documentsCol, args.document.id, "processing", nowFn());

    const classification = classifyDocument({
      domain: args.document.domain,
      userSelectedDocumentType: args.document.documentType,
    });

    const documentType =
      classification.documentType !== "unknown" ? classification.documentType : args.document.documentType;

    await documentsCol.doc(args.document.id).update({
      documentType,
      updatedAt: nowFn(),
    });

    job = await transitionJob(jobsCol, job, "extraction_queued", nowFn(), {
      documentType,
    });
    job = await transitionJob(jobsCol, job, "extracting", nowFn());

    const parserId = args.parserId ?? job.parserId;
    const parser = resolveDocumentParser(
      parserId ? { documentType, parserId } : { documentType },
    );
    const eligibility = await parser.canParse({
      documentId: args.document.id,
      domain: args.document.domain,
      documentType,
      mediaType: args.document.mediaType,
      byteSize: args.document.byteSize,
      checksumSha256: args.document.checksumSha256,
      storageObjectId: args.document.storageObjectId,
      safeDisplayFilename: args.document.safeDisplayFilename,
    });

    if (!eligibility.eligible) {
      job = await transitionJob(jobsCol, job, "extraction_unsupported", nowFn(), {
        parserId: parser.id,
        parserVersion: parser.version,
        errorCode: eligibility.reasonCode,
      });
      await updateDocumentStatus(documentsCol, args.document.id, "unsupported", nowFn(), {
        parser: { id: parser.id, version: parser.version },
      });
      job = await transitionJob(jobsCol, job, "completed", nowFn());
      return { job, extraction: null };
    }

    const parseInput: Parameters<typeof parser.parse>[0] = {
      documentId: args.document.id,
      domain: args.document.domain,
      documentType,
      mediaType: args.document.mediaType,
      byteSize: args.document.byteSize,
      checksumSha256: args.document.checksumSha256,
      storageObjectId: args.document.storageObjectId,
      safeDisplayFilename: args.document.safeDisplayFilename,
    };
    if (args.job.reprocessOfJobId) {
      parseInput.reprocess = {
        previousExtractionId: args.job.reprocessOfJobId,
        dryRun: args.job.dryRun,
      };
    }
    const rawExtraction = await parser.parse(parseInput);

    const validated = validateExtractionEnvelope(rawExtraction);
    if (!validated.ok) {
      job = await transitionJob(jobsCol, job, "extraction_failed", nowFn(), {
        parserId: parser.id,
        parserVersion: parser.version,
        errorCode: "EXTRACTION_ENVELOPE_INVALID",
        warningCodes: validated.issues.map((i) => i.code),
      });
      await updateDocumentStatus(documentsCol, args.document.id, "failed", nowFn(), {
        parser: { id: parser.id, version: parser.version },
      });
      return { job, extraction: null };
    }

    const extraction = validated.value;
    if (!args.job.dryRun) {
      const extractionId = `${args.document.id}_${parser.id}_${parser.version}_${Date.now()}`;
      await extractionsCol.doc(extractionId).set({
        ...extraction,
        id: extractionId,
        jobId: job.id,
        userId: args.uid,
        schemaVersion: DOCUMENT_SCHEMA_VERSION,
        superseded: false,
      });
    }

    if (extraction.status === "unsupported") {
      job = await transitionJob(jobsCol, job, "extraction_unsupported", nowFn(), {
        parserId: parser.id,
        parserVersion: parser.version,
        extractionVersion: extraction.extractionVersion,
      });
      await updateDocumentStatus(documentsCol, args.document.id, "unsupported", nowFn(), {
        parser: { id: parser.id, version: parser.version },
      });
      job = await transitionJob(jobsCol, job, "completed", nowFn());
      return { job, extraction };
    }

    job = await transitionJob(jobsCol, job, "extracted", nowFn(), {
      parserId: parser.id,
      parserVersion: parser.version,
      extractionVersion: extraction.extractionVersion,
    });
    job = await transitionJob(jobsCol, job, "validation_pending", nowFn());
    job = await transitionJob(jobsCol, job, "review_needed", nowFn());
    await updateDocumentStatus(documentsCol, args.document.id, "review_needed", nowFn(), {
      parser: { id: parser.id, version: parser.version },
    });
    return { job, extraction };
  } catch {
    const failedAt = nowFn();
    try {
      const snap = await jobsCol.doc(job.id).get();
      if (snap.exists) {
        const current = snap.data() as DocumentIngestionJob;
        const nextState: DocumentIngestionJobState =
          current.state === "extracting" || current.state === "extraction_queued"
            ? "extraction_failed"
            : current.state === "classifying"
              ? "extraction_failed"
              : "extraction_failed";
        const transition = transitionDocumentIngestionJobState(current.state, nextState);
        if (transition.ok) {
          await jobsCol.doc(job.id).set(
            {
              ...current,
              state: nextState,
              errorCode: "INGESTION_ORCHESTRATION_FAILED",
              updatedAt: failedAt,
              stateHistory: appendHistory(current, nextState, failedAt),
            },
            { merge: true },
          );
        }
      }
      await updateDocumentStatus(documentsCol, args.document.id, "failed", failedAt);
    } catch {
      // swallow secondary failures — never log document contents
    }
    return { job, extraction: null };
  }
}

export function createIngestionJobRecord(args: {
  document: UserDocumentRecord;
  dryRun?: boolean;
  reprocessOfJobId?: string;
  parserId?: string;
  now?: string;
}): DocumentIngestionJob {
  const now = args.now ?? new Date().toISOString();
  const id = randomUUID();
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    id,
    documentId: args.document.id,
    userId: args.document.userId,
    state: "created",
    domain: args.document.domain,
    documentType: args.document.documentType,
    ...(args.parserId ? { parserId: args.parserId } : {}),
    dryRun: args.dryRun ?? false,
    ...(args.reprocessOfJobId ? { reprocessOfJobId: args.reprocessOfJobId } : {}),
    warningCodes: [],
    createdAt: now,
    updatedAt: now,
    stateHistory: [{ state: "created", at: now }],
  };
}

export { documentRecordStatusFromJobState };
