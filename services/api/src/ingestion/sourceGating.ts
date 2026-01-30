// services/api/src/ingestion/sourceGating.ts
import type { IngestibleKind, SourceDoc, SupportedSchemaVersion } from "../types/sources";
import { getSource } from "../db/sources";

export type SourceGatingErrorCode =
  | "MISSING_SOURCE_ID"
  | "SOURCE_NOT_FOUND"
  | "SOURCE_INVALID_DOC"
  | "SOURCE_INACTIVE"
  | "SOURCE_KIND_NOT_ALLOWED"
  | "SOURCE_SCHEMA_VERSION_NOT_ALLOWED";

export type RequireActiveSourceResult =
  | { ok: true; source: SourceDoc }
  | { ok: false; status: 400 | 404 | 500; code: SourceGatingErrorCode; message: string };

export async function requireActiveSource(args: {
  uid: string;
  sourceId: string | null | undefined;
  kind: IngestibleKind;
  schemaVersion: SupportedSchemaVersion;
}): Promise<RequireActiveSourceResult> {
  const { uid, sourceId, kind, schemaVersion } = args;

  if (!sourceId) {
    return { ok: false, status: 400, code: "MISSING_SOURCE_ID", message: "sourceId is required" };
  }

  const got = await getSource(uid, sourceId);
  if (!got.ok) {
    if (got.status === 500) {
      return {
        ok: false,
        status: 500,
        code: "SOURCE_INVALID_DOC",
        message: got.message,
      };
    }

    return {
      ok: false,
      status: 404,
      code: "SOURCE_NOT_FOUND",
      message: "sourceId is not registered",
    };
  }

  const source = got.source;

  if (!source.isActive) {
    return { ok: false, status: 400, code: "SOURCE_INACTIVE", message: "source is disabled" };
  }

  if (!source.allowedKinds.includes(kind)) {
    return {
      ok: false,
      status: 400,
      code: "SOURCE_KIND_NOT_ALLOWED",
      message: "source does not allow this kind",
    };
  }

  if (!source.supportedSchemaVersions.includes(schemaVersion)) {
    return {
      ok: false,
      status: 400,
      code: "SOURCE_SCHEMA_VERSION_NOT_ALLOWED",
      message: "source does not support this schemaVersion",
    };
  }

  return { ok: true, source };
}
