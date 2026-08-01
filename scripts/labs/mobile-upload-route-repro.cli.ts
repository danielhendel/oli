#!/usr/bin/env npx tsx
/**
 * Reproduce the signed-in mobile Document OS upload → ingestion → review path.
 * Prints ONLY structural evidence — never report text, values, UIDs, or paths.
 *
 * Usage:
 *   GOOGLE_CLOUD_PROJECT=oli-staging-fdbba npx tsx --tsconfig scripts/tsconfig.json \
 *     scripts/labs/mobile-upload-route-repro.cli.ts \
 *     --env-file /path/to/.env.local \
 *     --pdf /path/to.pdf
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}

function loadEnvFile(path: string): void {
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function requireEnv(key: string): string {
  const v = process.env[key]?.trim();
  if (!v) throw new Error("MISSING_ENV");
  return v;
}

function log(obj: Record<string, unknown>): void {
  console.log(JSON.stringify(obj));
}

async function exchangeCustomToken(apiKey: string, customToken: string): Promise<string> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error("TOKEN_EXCHANGE_FAILED");
  const json = (await res.json()) as { idToken?: string };
  if (!json.idToken) throw new Error("TOKEN_EXCHANGE_FAILED");
  return json.idToken;
}

async function api(
  baseUrl: string,
  apiKey: string,
  idToken: string,
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      Authorization: `Bearer ${idToken}`,
      "x-request-id": `mobile-repro-${randomBytes(6).toString("hex")}`,
      ...(extraHeaders ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { parseError: true };
  }
  return { status: res.status, json };
}

async function main(): Promise<void> {
  const envFile = arg("--env-file");
  const pdfArg = arg("--pdf");
  if (!envFile || !existsSync(resolve(envFile))) {
    log({ ok: false, error: "ENV_FILE_REQUIRED" });
    process.exit(2);
  }
  if (!pdfArg || !existsSync(resolve(pdfArg))) {
    log({ ok: false, error: "PDF_REQUIRED" });
    process.exit(2);
  }
  loadEnvFile(resolve(envFile));

  const baseUrl = requireEnv("EXPO_PUBLIC_BACKEND_BASE_URL");
  const gatewayKey = requireEnv("EXPO_PUBLIC_GATEWAY_API_KEY");
  const firebaseApiKey = requireEnv("EXPO_PUBLIC_FIREBASE_API_KEY");
  const projectId = requireEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID");

  if (!getApps().length) {
    initializeApp({
      projectId,
      serviceAccountId:
        process.env.FIREBASE_SERVICE_ACCOUNT_ID?.trim() ||
        `oli-api-runtime@${projectId}.iam.gserviceaccount.com`,
    });
  }

  const auth = getAuth();
  const db = getFirestore();
  const pdf = readFileSync(resolve(pdfArg));
  const checksum = createHash("sha256").update(pdf).digest("hex");
  const redactedChecksum = `${checksum.slice(0, 8)}…`;

  const user = await auth.createUser({
    email: `labs.mobile.repro+${Date.now()}@example.invalid`,
    emailVerified: true,
  });
  const uid = user.uid;
  const idToken = await exchangeCustomToken(firebaseApiKey, await auth.createCustomToken(uid));

  try {
    const intent = await api(baseUrl, gatewayKey, idToken, "POST", "/users/me/documents/upload-intent", {
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "mobile-repro.pdf",
      mediaType: "application/pdf",
      byteSize: pdf.length,
    });
    log({
      step: "upload_intent",
      ok: intent.status === 201 || intent.status === 200,
      http: intent.status,
      hasDocumentId: typeof intent.json?.documentId === "string",
    });
    const documentId = String(intent.json?.documentId ?? "");
    if (!documentId) {
      process.exit(1);
    }

    const completeStarted = Date.now();
    const complete = await api(
      baseUrl,
      gatewayKey,
      idToken,
      "POST",
      `/users/me/documents/${encodeURIComponent(documentId)}/complete-upload`,
      {
        fileBase64: pdf.toString("base64"),
        originalFilename: "mobile-repro.pdf",
        mediaType: "application/pdf",
        checksumSha256: checksum,
      },
      { "Idempotency-Key": `mobile-repro-${documentId}` },
    );
    log({
      step: "complete_upload",
      ok: complete.status === 202 || complete.status === 200,
      http: complete.status,
      status: complete.json?.status ?? null,
      duplicate: Boolean(complete.json?.duplicate),
      elapsedMs: Date.now() - completeStarted,
      checksum: redactedChecksum,
    });

    const activeDocId = String(complete.json?.documentId ?? documentId);
    let terminalStatus = "";
    let parserId = "";
    let jobState = "";
    let jobParserId: string | null = null;
    let jobError: string | null = null;
    let drafts = 0;
    let reviews = 0;

    for (let i = 0; i < 45; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const detail = await api(
        baseUrl,
        gatewayKey,
        idToken,
        "GET",
        `/users/me/documents/${encodeURIComponent(activeDocId)}`,
      );
      const doc = detail.json?.document ?? detail.json;
      terminalStatus = String(doc?.status ?? "");
      parserId = String(doc?.parser?.id ?? "");

      const jobsSnap = await db
        .collection("users")
        .doc(uid)
        .collection("documentIngestionJobs")
        .where("documentId", "==", activeDocId)
        .limit(10)
        .get();
      const job = jobsSnap.docs
        .map((d) => d.data() as any)
        .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))[0];
      jobState = String(job?.state ?? "");
      jobParserId = typeof job?.parserId === "string" ? job.parserId : null;
      jobError = typeof job?.errorCode === "string" ? job.errorCode : null;

      const draftsSnap = await db
        .collection("users")
        .doc(uid)
        .collection("labExtractionDrafts")
        .where("documentId", "==", activeDocId)
        .get();
      drafts = draftsSnap.size;
      const reviewsSnap = await db
        .collection("users")
        .doc(uid)
        .collection("labReviews")
        .where("documentId", "==", activeDocId)
        .get();
      reviews = reviewsSnap.size;

      if (["review_needed", "unsupported", "failed", "structured"].includes(terminalStatus)) {
        log({
          step: "document_terminal",
          status: terminalStatus,
          parserId: parserId || null,
          jobState,
          jobParserId,
          jobError,
          drafts,
          reviews,
          poll: i,
        });
        break;
      }
      if (i === 44) {
        log({
          step: "document_timeout",
          status: terminalStatus,
          parserId: parserId || null,
          jobState,
          jobParserId,
          jobError,
          drafts,
          reviews,
        });
      }
    }

    const review = await api(
      baseUrl,
      gatewayKey,
      idToken,
      "GET",
      `/users/me/labs/reviews/${encodeURIComponent(activeDocId)}`,
    );
    log({
      step: "labs_review",
      http: review.status,
      hasReview: review.json?.review != null || review.json?.ok === true,
      reviewStatus: review.json?.review?.status ?? review.json?.status ?? null,
    });

    const list = await api(baseUrl, gatewayKey, idToken, "GET", "/users/me/documents?domain=labs&limit=10");
    const items = Array.isArray(list.json?.items) ? list.json.items : [];
    const row = items.find((it: any) => it?.id === activeDocId);
    log({
      step: "labs_list_row",
      http: list.status,
      found: Boolean(row),
      status: row?.status ?? null,
      statusLabel: row?.statusLabel ?? null,
    });

    log({
      step: "summary",
      ok: terminalStatus === "review_needed" && drafts > 0 && reviews > 0,
      terminalStatus,
      drafts,
      reviews,
      jobParserId,
      parserId: parserId || null,
    });
  } finally {
    for (const col of [
      "documents",
      "documentIngestionJobs",
      "documentExtractions",
      "labExtractionDrafts",
      "labReviews",
      "labUploads",
      "labResults",
      "labAcceptedResults",
    ]) {
      const snap = await db.collection("users").doc(uid).collection(col).limit(200).get();
      for (const doc of snap.docs) await doc.ref.delete().catch(() => undefined);
    }
    await auth.deleteUser(uid).catch(() => undefined);
    log({ step: "cleanup", ok: true });
  }
}

main().catch((err) => {
  log({ ok: false, error: String((err as Error)?.message ?? err).slice(0, 120) });
  process.exit(1);
});
