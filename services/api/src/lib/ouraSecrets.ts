/**
 * Oura token custody — Secret Manager only (API side).
 * Never log, return, or export refresh tokens or client secret.
 */

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { GoogleAuth } from "google-auth-library";

/** Thrown when project id or Secret Manager config is missing. Handlers must catch and return HTTP 500 (no process crash). */
export class OuraConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OuraConfigError";
    Object.setPrototypeOf(this, OuraConfigError.prototype);
  }
}

// Lazily initialized clients (Cloud Run safe)
let _client: SecretManagerServiceClient | null = null;
let _auth: GoogleAuth | null = null;

function getClient(): SecretManagerServiceClient {
  if (!_client) _client = new SecretManagerServiceClient();
  return _client;
}

function getAuth(): GoogleAuth {
  if (!_auth) _auth = new GoogleAuth();
  return _auth;
}

function resolveProjectIdFromEnv(): string {
  return (
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GCP_PROJECT?.trim() ||
    process.env.PROJECT_ID?.trim() ||
    ""
  );
}

/**
 * Cloud Run safe project id resolution.
 * Fail-closed with OuraConfigError if missing.
 */
export async function getProjectId(): Promise<string> {
  const envId = resolveProjectIdFromEnv();
  if (envId) return envId;

  try {
    const pid = await getAuth().getProjectId();
    if (pid) return String(pid).trim();
  } catch {
    // ignore and fail closed below
  }

  throw new OuraConfigError("Oura secrets: missing project id (env or ADC)");
}

export function secretIdRefreshToken(uid: string): string {
  return `oura-refresh-token-${uid}`;
}

export function secretIdClientSecret(): string {
  return "oura-client-secret";
}

function secretName(projectId: string, secretId: string): string {
  return `projects/${projectId}/secrets/${secretId}`;
}

function latestVersionName(projectId: string, secretId: string): string {
  return `projects/${projectId}/secrets/${secretId}/versions/latest`;
}

/** Secret version already unusable — skip destroy (idempotent revoke). */
function isAlreadyGoneSecretVersion(version: { state?: string | null | undefined }): boolean {
  const s = version.state;
  return s === "DESTROYED" || s === "DISABLED";
}

/** Destroy is a no-op when custody was already removed (e.g. prior reconnect cleanup). */
function isIgnorableDestroySecretVersionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("NOT_FOUND") || msg.includes("404")) return true;
  if (msg.includes("DESTROYED") || msg.includes("FAILED_PRECONDITION")) return true;
  const code = (e as { code?: number }).code;
  return code === 5 || code === 9;
}

export async function getRefreshToken(uid: string): Promise<string | null> {
  const projectId = await getProjectId();
  const id = secretIdRefreshToken(uid);
  const client = getClient();
  try {
    const [version] = await client.accessSecretVersion({
      name: latestVersionName(projectId, id),
    });
    const payload = version.payload?.data;
    if (!payload || !(payload instanceof Uint8Array)) return null;
    return Buffer.from(payload).toString("utf8").trim() || null;
  } catch {
    return null;
  }
}

export async function setRefreshToken(uid: string, value: string): Promise<void> {
  const projectId = await getProjectId();
  const id = secretIdRefreshToken(uid);
  const client = getClient();
  const parent = `projects/${projectId}`;

  try {
    await client.createSecret({
      parent,
      secretId: id,
      secret: { replication: { automatic: {} } },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("ALREADY_EXISTS")) throw e;
  }

  await client.addSecretVersion({
    parent: secretName(projectId, id),
    payload: { data: Buffer.from(value, "utf8") },
  });
}

/**
 * Destroy all enabled versions of user's Oura refresh token (makes secret unusable).
 * Idempotent: missing secret, no versions, or already-destroyed versions => success.
 */
export async function deleteRefreshToken(uid: string): Promise<void> {
  const projectId = await getProjectId();
  const id = secretIdRefreshToken(uid);
  const client = getClient();
  const parent = secretName(projectId, id);

  let versions: { name?: string | null; state?: string | null }[];
  try {
    const [listed] = await client.listSecretVersions({ parent });
    versions = (listed ?? []).map((v) => ({
      name: v.name ?? null,
      state: v.state != null ? String(v.state) : null,
    }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("NOT_FOUND") || msg.includes("404")) return;
    throw e;
  }

  if (!Array.isArray(versions) || versions.length === 0) return;

  for (const v of versions) {
    const versionName = v.name;
    if (versionName == null || versionName === "") continue;
    if (isAlreadyGoneSecretVersion(v)) continue;
    try {
      await client.destroySecretVersion({ name: versionName });
    } catch (e: unknown) {
      if (isIgnorableDestroySecretVersionError(e)) continue;
      throw e;
    }
  }
}

export async function getClientSecret(): Promise<string | null> {
  const projectId = await getProjectId();
  const id = secretIdClientSecret();
  const client = getClient();

  try {
    const [version] = await client.accessSecretVersion({
      name: latestVersionName(projectId, id),
    });
    const payload = version.payload?.data;
    if (!payload || !(payload instanceof Uint8Array)) return null;
    return Buffer.from(payload).toString("utf8").trim() || null;
  } catch {
    return null;
  }
}
