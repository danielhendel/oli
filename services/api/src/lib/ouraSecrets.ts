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

export type SecretVersionRef = {
  name: string;
  state: string | null;
};

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

/** Parse numeric suffix from `.../versions/N` (for stable newest-first ordering). */
export function parseSecretVersionNumber(versionName: string): number | null {
  const match = /\/versions\/(\d+)$/.exec(versionName);
  if (!match?.[1]) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Secret version already unusable — skip destroy (idempotent revoke). */
function isEnabledSecretVersion(version: { state?: string | null | undefined }): boolean {
  return version.state === "ENABLED";
}

/** Destroy is a no-op when custody was already removed (e.g. prior reconnect cleanup). */
function isIgnorableDestroySecretVersionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("NOT_FOUND") || msg.includes("404")) return true;
  if (msg.includes("DESTROYED") || msg.includes("FAILED_PRECONDITION")) return true;
  const code = (e as { code?: number }).code;
  return code === 5 || code === 9;
}

/** List all secret versions (paginated). Never returns payload data. */
export async function listAllSecretVersions(
  projectId: string,
  secretId: string,
): Promise<SecretVersionRef[]> {
  const client = getClient();
  const parent = secretName(projectId, secretId);
  const versions: SecretVersionRef[] = [];

  try {
    for await (const version of client.listSecretVersionsAsync({ parent })) {
      const name = version.name?.trim();
      if (!name) continue;
      versions.push({
        name,
        state: version.state != null ? String(version.state) : null,
      });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("NOT_FOUND") || msg.includes("404")) return [];
    throw e;
  }

  return versions;
}

export async function listEnabledSecretVersions(
  projectId: string,
  secretId: string,
): Promise<SecretVersionRef[]> {
  const versions = await listAllSecretVersions(projectId, secretId);
  return versions.filter(isEnabledSecretVersion);
}

export type DestroyOldSecretVersionsResult = {
  destroyed: number;
  errorsIgnored: number;
};

/**
 * Destroy enabled secret versions except those in keepVersionNames.
 * Idempotent: missing secret, empty list, already-destroyed versions => success.
 */
export async function destroyOldSecretVersions(
  projectId: string,
  secretId: string,
  keepVersionNames: ReadonlySet<string>,
): Promise<DestroyOldSecretVersionsResult> {
  const client = getClient();
  const enabledVersions = await listEnabledSecretVersions(projectId, secretId);

  let destroyed = 0;
  let errorsIgnored = 0;

  for (const version of enabledVersions) {
    if (keepVersionNames.has(version.name)) continue;

    try {
      await client.destroySecretVersion({ name: version.name });
      destroyed += 1;
    } catch (e: unknown) {
      if (isIgnorableDestroySecretVersionError(e)) {
        errorsIgnored += 1;
        continue;
      }
      throw e;
    }
  }

  return { destroyed, errorsIgnored };
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

  const [newVersion] = await client.addSecretVersion({
    parent: secretName(projectId, id),
    payload: { data: Buffer.from(value, "utf8") },
  });

  const newVersionName = newVersion.name?.trim();
  if (!newVersionName) {
    throw new OuraConfigError("Oura secrets: addSecretVersion returned no version name");
  }

  // Best-effort retention: keep only the version we just created. Partial cleanup failure
  // must not fail token persistence — billing cleanup can be retried via admin script.
  try {
    await destroyOldSecretVersions(projectId, id, new Set([newVersionName]));
  } catch {
    // Swallow cleanup errors after successful add; newest version remains enabled.
  }
}

/**
 * Destroy all enabled versions of user's Oura refresh token (makes secret unusable).
 * Idempotent: missing secret, no versions, or already-destroyed versions => success.
 */
export async function deleteRefreshToken(uid: string): Promise<void> {
  const projectId = await getProjectId();
  const id = secretIdRefreshToken(uid);
  await destroyOldSecretVersions(projectId, id, new Set());
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
