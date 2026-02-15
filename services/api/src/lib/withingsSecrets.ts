/**
 * Withings token custody — Secret Manager only (API side).
 * Same naming as services/functions/src/security/withingsSecrets.ts.
 * Never log, return, or export refresh tokens or client secret.
 */

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { GoogleAuth } from "google-auth-library";

/** Thrown when project id or Secret Manager config is missing. Handlers must catch and return HTTP 500 (no process crash). */
export class WithingsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WithingsConfigError";
    Object.setPrototypeOf(this, WithingsConfigError.prototype);
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
 * Cloud Run safe project id resolution:
 * - Prefer env if present
 * - Fallback to ADC metadata (GoogleAuth.getProjectId)
 * Fail-closed with WithingsConfigError if still missing.
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

  throw new WithingsConfigError("Withings secrets: missing project id (env or ADC)");
}

export function secretIdRefreshToken(uid: string): string {
  return `withings-refresh-token-${uid}`;
}

export function secretIdClientSecret(): string {
  return "withings-client-secret";
}

export function secretName(projectId: string, secretId: string): string {
  return `projects/${projectId}/secrets/${secretId}`;
}

function latestVersionName(projectId: string, secretId: string): string {
  return `projects/${projectId}/secrets/${secretId}/versions/latest`;
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
 * Destroy all versions of user's Withings refresh token (makes secret unusable).
 * Idempotent: if secret does not exist => no-op success.
 * Uses destroySecretVersion only (no deleteSecret); requires secretVersionManager, not admin.
 */
export async function deleteRefreshToken(uid: string): Promise<void> {
  const projectId = await getProjectId();
  const id = secretIdRefreshToken(uid);
  const client = getClient();
  const parent = secretName(projectId, id);

  let versions: { name?: string | null }[];
  try {
    [versions] = await client.listSecretVersions({ parent });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("NOT_FOUND") || msg.includes("404")) return;
    throw e;
  }

  if (!Array.isArray(versions) || versions.length === 0) return;

  for (const v of versions) {
    const versionName = v.name;
    if (versionName == null || versionName === "") continue;
    await client.destroySecretVersion({ name: versionName });
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
