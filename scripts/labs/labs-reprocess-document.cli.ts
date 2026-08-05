#!/usr/bin/env npx tsx
/**
 * One-shot reprocess for signed-in Labs integrity rebuild (local admin only).
 * Prints structural status only — no PHI.
 */
import { readFileSync } from "node:fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}

function log(obj: Record<string, unknown>) {
  console.log(JSON.stringify(obj));
}

async function main() {
  loadEnv(arg("--env-file") || "/Users/danielhendel/oli/.env.local");
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!;
  const baseUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL!;
  const gatewayKey = process.env.EXPO_PUBLIC_GATEWAY_API_KEY!;
  const firebaseApiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY!;
  const uid = arg("--uid");
  const documentId = arg("--document-id");
  if (!uid || !documentId) {
    log({ ok: false, error: "UID_AND_DOCUMENT_REQUIRED" });
    process.exit(2);
  }
  if (!getApps().length) {
    initializeApp({
      projectId,
      serviceAccountId: `oli-api-runtime@${projectId}.iam.gserviceaccount.com`,
    });
  }
  const customToken = await getAuth().createCustomToken(uid);
  const tokRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const tokJson = (await tokRes.json()) as { idToken?: string };
  if (!tokJson.idToken) {
    log({ ok: false, error: "TOKEN_FAILED" });
    process.exit(1);
  }
  const idToken = tokJson.idToken;
  const reprocess = await fetch(
    `${baseUrl.replace(/\/$/, "")}/users/me/documents/${encodeURIComponent(documentId)}/reprocess`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-key": gatewayKey,
        Authorization: `Bearer ${idToken}`,
        "Idempotency-Key": `integrity-reprocess-${Date.now()}`,
      },
      body: JSON.stringify({}),
    },
  );
  const text = await reprocess.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = { parseError: true };
  }
  log({
    ok: reprocess.status >= 200 && reprocess.status < 300,
    http: reprocess.status,
    status: json.status ?? null,
    hasJobId: typeof json.jobId === "string",
  });
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const detail = await fetch(
      `${baseUrl.replace(/\/$/, "")}/users/me/documents/${encodeURIComponent(documentId)}`,
      {
        headers: {
          Accept: "application/json",
          "x-api-key": gatewayKey,
          Authorization: `Bearer ${idToken}`,
        },
      },
    );
    const djson = (await detail.json()) as Record<string, unknown>;
    const doc = (djson.document as Record<string, unknown> | undefined) ?? djson;
    const st = doc.status ?? null;
    log({ poll: i, http: detail.status, status: st });
    if (st && st !== "processing" && st !== "uploaded" && st !== "stored") break;
  }
}

main().catch((err) => {
  log({ ok: false, error: "FATAL", message: err instanceof Error ? err.message : "unknown" });
  process.exit(1);
});
