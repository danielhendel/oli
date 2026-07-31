#!/usr/bin/env npx tsx
/**
 * Synthetic staging Labs lifecycle probe (Phase 3D-A).
 * Prints ONLY structural PASS/FAIL lines — never tokens, UIDs, values, or paths.
 *
 * Requires (loaded from --env-file, never printed):
 *   EXPO_PUBLIC_BACKEND_BASE_URL
 *   EXPO_PUBLIC_GATEWAY_API_KEY
 *   EXPO_PUBLIC_FIREBASE_API_KEY
 *   EXPO_PUBLIC_FIREBASE_PROJECT_ID
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=... npx tsx --tsconfig scripts/tsconfig.json \
 *     scripts/labs/staging-labs-lifecycle-probe.cli.ts \
 *     --env-file /path/to/.env.local
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

type StepResult = { step: string; ok: boolean; detail?: string };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}

function loadEnvFile(path: string): void {
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\n/)) {
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
  if (!v) throw new Error(`MISSING_ENV`);
  return v;
}

/** Minimal one-page PDF with Quest-like text layer (Helvetica Tj). */
function syntheticQuestPdfBytes(): Buffer {
  const lines = [
    "Quest Diagnostics DirectLabs Laboratory Report",
    "Report Status: FINAL",
    "Collected: 03/15/2024 08:30 AM",
    "Reported: 03/16/2024 09:00 AM",
    "Fasting: Yes",
    "LIPID PANEL",
    "LDL-CHOLESTEROL 98 <100 mg/dL",
    "HDL-CHOLESTEROL 55 >40 mg/dL",
    "TRIGLYCERIDES <4 mg/dL",
    "HEPATITIS C AB NEGATIVE",
    "TSH 1.80 0.40-4.50 mIU/L",
  ];
  // Build a simple PDF with one text object; keep content short for gateway limits.
  const contentStream = [
    "BT",
    "/F1 10 Tf",
    "36 750 Td",
    ...lines.flatMap((line, idx) => {
      const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      if (idx === 0) return [`(${escaped}) Tj`];
      return ["0 -14 Td", `(${escaped}) Tj`];
    }),
    "ET",
  ].join("\n");
  const contentLen = Buffer.byteLength(contentStream, "utf8");
  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
  );
  objects.push(`4 0 obj<< /Length ${contentLen} >>stream\n${contentStream}\nendstream\nendobj\n`);
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
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
      "x-request-id": `labs-probe-${randomBytes(8).toString("hex")}`,
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

function record(results: StepResult[], step: string, ok: boolean, detail?: string) {
  results.push({ step, ok, ...(detail ? { detail } : {}) });
  console.log(JSON.stringify({ step, ok, ...(detail ? { detail } : {}) }));
}

async function main() {
  const envFile = arg("--env-file");
  if (!envFile || !existsSync(resolve(envFile))) {
    console.error(JSON.stringify({ ok: false, error: "ENV_FILE_REQUIRED" }));
    process.exit(2);
  }
  loadEnvFile(resolve(envFile));

  const baseUrl = requireEnv("EXPO_PUBLIC_BACKEND_BASE_URL");
  const gatewayKey = requireEnv("EXPO_PUBLIC_GATEWAY_API_KEY");
  const firebaseApiKey = requireEnv("EXPO_PUBLIC_FIREBASE_API_KEY");
  const projectId = requireEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID");

  if (!getApps().length) {
    // User ADC cannot sign custom tokens without an explicit service account id.
    initializeApp({
      projectId,
      serviceAccountId: process.env.FIREBASE_SERVICE_ACCOUNT_ID?.trim() || `oli-api-runtime@${projectId}.iam.gserviceaccount.com`,
    });
  }
  const auth = getAuth();
  const db = getFirestore();

  const results: StepResult[] = [];
  const syntheticEmail = `labs.phase3da.probe+${Date.now()}@example.invalid`;
  let uid = "";
  let idToken = "";
  let documentId = "";
  let unrelatedDocumentId = "";
  let reviewVersion = 0;
  let acceptedCandidateId = "";
  let rejectCandidateId = "";
  let qualitativeCandidateId = "";
  let inequalityCandidateId = "";

  try {
    const user = await auth.createUser({
      email: syntheticEmail,
      emailVerified: true,
      disabled: false,
    });
    uid = user.uid;
    const custom = await auth.createCustomToken(uid);
    idToken = await exchangeCustomToken(firebaseApiKey, custom);
    record(results, "auth_synthetic_user", true);

    const fixturePdf = resolve(
      process.cwd(),
      "lib/labs/extraction/__fixtures__/quest_synthetic_lifecycle_v1.pdf",
    );
    const pdf = existsSync(fixturePdf) ? readFileSync(fixturePdf) : syntheticQuestPdfBytes();
    const checksum = createHash("sha256").update(pdf).digest("hex");
    const b64 = pdf.toString("base64");
    record(results, "synthetic_pdf_ready", pdf.length > 500, `bytes=${pdf.length}`);

    // Unrelated report first (same filename later for same-filename retention check).
    const unrelatedPdf = Buffer.from(pdf); // same bytes ok for separate intent before checksum dedupe — change one byte
    const unrelatedMut = Buffer.from(unrelatedPdf);
    unrelatedMut[unrelatedMut.length - 5] = (unrelatedMut[unrelatedMut.length - 5]! ^ 0x01) & 0xff;
    const unrelatedChecksum = createHash("sha256").update(unrelatedMut).digest("hex");
    const unrelatedB64 = unrelatedMut.toString("base64");

    const intentUnrelated = await api(baseUrl, gatewayKey, idToken, "POST", "/users/me/documents/upload-intent", {
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "SyntheticQuestUnrelated.pdf",
      mediaType: "application/pdf",
      byteSize: unrelatedMut.length,
      checksumSha256: unrelatedChecksum,
    });
    record(results, "upload_unrelated_intent", intentUnrelated.status === 201 && !!intentUnrelated.json?.documentId);
    unrelatedDocumentId = String(intentUnrelated.json?.documentId ?? "");
    const completeUnrelated = await api(
      baseUrl,
      gatewayKey,
      idToken,
      "POST",
      `/users/me/documents/${encodeURIComponent(unrelatedDocumentId)}/complete-upload`,
      {
        originalFilename: "SyntheticQuestUnrelated.pdf",
        mediaType: "application/pdf",
        fileBase64: unrelatedB64,
        checksumSha256: unrelatedChecksum,
      },
    );
    record(results, "upload_unrelated_complete", completeUnrelated.status === 202 || completeUnrelated.status === 200);

    const intent = await api(baseUrl, gatewayKey, idToken, "POST", "/users/me/documents/upload-intent", {
      domain: "labs",
      documentType: "lab_report",
      originalFilename: "SyntheticQuestLifecycle.pdf",
      mediaType: "application/pdf",
      byteSize: pdf.length,
      checksumSha256: checksum,
    });
    record(results, "upload_intent", intent.status === 201 && !!intent.json?.documentId, `http_${intent.status}`);
    documentId = String(intent.json?.documentId ?? "");

    const complete = await api(
      baseUrl,
      gatewayKey,
      idToken,
      "POST",
      `/users/me/documents/${encodeURIComponent(documentId)}/complete-upload`,
      {
        originalFilename: "SyntheticQuestLifecycle.pdf",
        mediaType: "application/pdf",
        fileBase64: b64,
        checksumSha256: checksum,
      },
    );
    record(results, "upload_complete", complete.status === 202 || complete.status === 200, `http_${complete.status}`);
    if (complete.json?.documentId) documentId = String(complete.json.documentId);

    // Poll processing
    let status = "";
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const detail = await api(
        baseUrl,
        gatewayKey,
        idToken,
        "GET",
        `/users/me/documents/${encodeURIComponent(documentId)}`,
      );
      status = String(detail.json?.item?.status ?? detail.json?.document?.status ?? detail.json?.status ?? "");
      if (["review_needed", "structured", "failed", "unsupported"].includes(status)) break;
    }
    record(results, "processing_settled", status === "review_needed" || status === "structured", status || "timeout");
    record(results, "review_needed_state", status === "review_needed", status);

    // Structural draft diagnostics (codes only).
    const draftSnap = await db
      .collection("users")
      .doc(uid)
      .collection("labExtractionDrafts")
      .where("documentId", "==", documentId)
      .limit(5)
      .get();
    const draftStatuses = draftSnap.docs.map((d) => String((d.data() as any)?.status ?? ""));
    const draftWarningCodes = draftSnap.docs.flatMap((d) =>
      Array.isArray((d.data() as any)?.warnings)
        ? (d.data() as any).warnings.map((w: any) => String(w?.code ?? "unknown"))
        : [],
    );
    record(
      results,
      "extraction_draft_present",
      draftSnap.size > 0,
      `drafts=${draftSnap.size};statuses=${draftStatuses.join(",") || "none"};warn=${[...new Set(draftWarningCodes)].join(",") || "none"}`,
    );

    const review = await api(
      baseUrl,
      gatewayKey,
      idToken,
      "GET",
      `/users/me/labs/reviews/${encodeURIComponent(documentId)}`,
    );
    record(results, "review_detail", review.status === 200 && review.json?.ok === true, `http_${review.status}`);
    const summary = review.json?.summary ?? {};
    reviewVersion = Number(summary.reviewVersion ?? 0);
    record(results, "report_metadata", typeof summary.laboratoryName !== "undefined" || summary.collectedAt != null);
    record(results, "matched_candidates", Number(summary.matchedCount ?? 0) > 0, `n=${Number(summary.matchedCount ?? 0)}`);
    record(results, "unmatched_candidates", Number(summary.unmatchedCount ?? 0) >= 0);

    const candidates: any[] = Array.isArray(review.json?.candidates) ? review.json.candidates : [];
    const unmatched: any[] = Array.isArray(review.json?.unmatched) ? review.json.unmatched : [];
    const all = [...candidates, ...unmatched];
    acceptedCandidateId = String(candidates.find((c) => c.canonicalMetricId)?.id ?? candidates[0]?.id ?? "");
    rejectCandidateId = String(
      candidates.find((c) => c.id !== acceptedCandidateId)?.id ?? unmatched[0]?.id ?? "",
    );
    qualitativeCandidateId = String(
      all.find((c) => /negative|positive|reactive/i.test(String(c.rawResult ?? "")))?.id ?? "",
    );
    inequalityCandidateId = String(
      all.find((c) => /^<|>|^≤|^≥|^<=|^>=/.test(String(c.rawResult ?? "").trim()))?.id ?? "",
    );

    // Correction
    if (acceptedCandidateId) {
      const patch = await api(
        baseUrl,
        gatewayKey,
        idToken,
        "PATCH",
        `/users/me/labs/reviews/${encodeURIComponent(documentId)}/candidates/${encodeURIComponent(acceptedCandidateId)}`,
        {
          reviewVersion,
          correction: { rawFlag: "H" },
        },
      );
      record(results, "correction", patch.status === 200 && typeof patch.json?.reviewVersion === "number");
      reviewVersion = Number(patch.json?.reviewVersion ?? reviewVersion);
    } else {
      record(results, "correction", false, "no_candidate");
    }

    // Stale version conflict
    const stale = await api(
      baseUrl,
      gatewayKey,
      idToken,
      "PATCH",
      `/users/me/labs/reviews/${encodeURIComponent(documentId)}/candidates/${encodeURIComponent(acceptedCandidateId || "x")}`,
      {
        reviewVersion: Math.max(0, reviewVersion - 1),
        reviewStatus: "accepted",
      },
    );
    record(results, "stale_version_409", stale.status === 409);

    // Reject
    if (rejectCandidateId) {
      const rej = await api(
        baseUrl,
        gatewayKey,
        idToken,
        "POST",
        `/users/me/labs/reviews/${encodeURIComponent(documentId)}/reject`,
        { reviewVersion, candidateIds: [rejectCandidateId] },
        { "Idempotency-Key": `reject-${documentId}-${reviewVersion}` },
      );
      record(results, "rejection", rej.status === 200);
      reviewVersion = Number(rej.json?.reviewVersion ?? reviewVersion);
    } else {
      record(results, "rejection", false, "no_reject_candidate");
    }

    // Save/resume = reload
    const resume = await api(
      baseUrl,
      gatewayKey,
      idToken,
      "GET",
      `/users/me/labs/reviews/${encodeURIComponent(documentId)}`,
    );
    record(results, "save_resume", resume.status === 200 && Number(resume.json?.summary?.reviewVersion) === reviewVersion);
    reviewVersion = Number(resume.json?.summary?.reviewVersion ?? reviewVersion);

    const acceptIds = [acceptedCandidateId, qualitativeCandidateId, inequalityCandidateId].filter(
      (id, idx, arr) => id && arr.indexOf(id) === idx,
    );
    const acceptBody = {
      reviewVersion,
      candidateIds: acceptIds.length > 0 ? acceptIds : candidates.slice(0, 2).map((c) => c.id),
    };
    const acceptKey = `accept-${documentId}-${reviewVersion}`;
    const accept = await api(
      baseUrl,
      gatewayKey,
      idToken,
      "POST",
      `/users/me/labs/reviews/${encodeURIComponent(documentId)}/accept`,
      acceptBody,
      { "Idempotency-Key": acceptKey },
    );
    record(results, "accept_selected", accept.status === 200 && Number(accept.json?.acceptedCount ?? 0) > 0, `http_${accept.status}`);
    const acceptedCount1 = Number(accept.json?.acceptedCount ?? 0);
    reviewVersion = Number(accept.json?.reviewVersion ?? reviewVersion);

    const acceptReplay = await api(
      baseUrl,
      gatewayKey,
      idToken,
      "POST",
      `/users/me/labs/reviews/${encodeURIComponent(documentId)}/accept`,
      acceptBody,
      { "Idempotency-Key": acceptKey },
    );
    record(
      results,
      "accept_idempotent",
      acceptReplay.status === 200 &&
        (acceptReplay.json?.idempotentReplay === true ||
          Number(acceptReplay.json?.acceptedCount ?? -1) === acceptedCount1),
    );

    // Firestore structural checks (counts only)
    const acceptedSnap = await db.collection("users").doc(uid).collection("labAcceptedResults").get();
    const projectedSnap = await db.collection("users").doc(uid).collection("labResults").get();
    const acceptedDocs = acceptedSnap.docs.map((d) => d.data() as any);
    record(results, "accepted_structured_results", acceptedDocs.length > 0, `n=${acceptedDocs.length}`);
    record(
      results,
      "numeric_projection",
      projectedSnap.size > 0 || acceptedDocs.some((a) => a?.result?.kind === "numeric" && a?.result?.comparator === "eq"),
      `projected=${projectedSnap.size}`,
    );
    record(
      results,
      "qualitative_retained",
      qualitativeCandidateId
        ? acceptedDocs.some((a) => a?.result?.kind === "qualitative" || a?.sourceCandidateId === qualitativeCandidateId)
        : true,
      qualitativeCandidateId ? undefined : "no_qualitative_candidate",
    );
    record(
      results,
      "inequality_retained",
      inequalityCandidateId
        ? acceptedDocs.some(
            (a) =>
              a?.sourceCandidateId === inequalityCandidateId ||
              (a?.result?.kind === "numeric" && a?.result?.comparator && a?.result?.comparator !== "eq"),
          )
        : true,
      inequalityCandidateId ? undefined : "no_inequality_candidate",
    );
    record(
      results,
      "rejected_absent",
      rejectCandidateId ? !acceptedDocs.some((a) => a?.sourceCandidateId === rejectCandidateId) : true,
    );

    // Reprocess
    const acceptedBeforeReprocess = acceptedDocs.length;
    const reprocess = await api(
      baseUrl,
      gatewayKey,
      idToken,
      "POST",
      `/users/me/documents/${encodeURIComponent(documentId)}/reprocess`,
      {},
    );
    record(results, "reprocess", reprocess.status === 200 || reprocess.status === 202, `http_${reprocess.status}`);
    await new Promise((r) => setTimeout(r, 4000));
    const drafts = await db.collection("users").doc(uid).collection("labExtractionDrafts").where("documentId", "==", documentId).get();
    record(results, "reprocess_new_draft", drafts.size >= 1, `drafts=${drafts.size}`);
    const acceptedAfter = await db.collection("users").doc(uid).collection("labAcceptedResults").get();
    record(results, "accepted_unchanged_after_reprocess", acceptedAfter.size === acceptedBeforeReprocess, `n=${acceptedAfter.size}`);

    // Export
    const exportRes = await api(baseUrl, gatewayKey, idToken, "POST", "/export", {});
    record(results, "export_requested", exportRes.status === 202 || exportRes.status === 200, `http_${exportRes.status}`);
    const exportId = String(exportRes.json?.exportId ?? exportRes.json?.id ?? "");
    let exportStatus = "";
    let exportArtifactPath = "";
    for (let i = 0; i < 40 && exportId; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const expDoc = await db.collection("users").doc(uid).collection("accountExports").doc(exportId).get();
      if (!expDoc.exists) continue;
      const data = expDoc.data() as any;
      exportStatus = String(data?.status ?? "");
      exportArtifactPath = String(data?.artifactPath ?? data?.storagePath ?? "");
      if (exportStatus === "succeeded" || exportStatus === "failed" || exportStatus === "partial") break;
    }
    record(results, "export_job_terminal", exportStatus === "succeeded" || exportStatus === "partial", exportStatus || "timeout");
    // Package content verification via Firestore export job fields / artifact metadata only when present.
    // Full zip inspection requires Storage download — mark explicit if artifact missing.
    record(results, "export_artifact_present", !!exportArtifactPath && exportStatus === "succeeded", exportStatus);

    // Cross-user deny
    const other = await auth.createUser({
      email: `labs.phase3da.other+${Date.now()}@example.invalid`,
      emailVerified: true,
    });
    const otherToken = await exchangeCustomToken(firebaseApiKey, await auth.createCustomToken(other.uid));
    const cross = await api(
      baseUrl,
      gatewayKey,
      otherToken,
      "GET",
      `/users/me/labs/reviews/${encodeURIComponent(documentId)}`,
    );
    record(results, "cross_user_denied", cross.status === 404 || cross.status === 403 || cross.status === 401, `http_${cross.status}`);
    await auth.deleteUser(other.uid).catch(() => undefined);

    // Delete source
    const projectedBeforeDelete = projectedSnap.size;
    const del = await api(
      baseUrl,
      gatewayKey,
      idToken,
      "DELETE",
      `/users/me/documents/${encodeURIComponent(documentId)}`,
    );
    record(results, "delete_source", del.status === 200 || del.status === 204, `http_${del.status}`);
    await new Promise((r) => setTimeout(r, 2000));

    const draftsAfter = await db.collection("users").doc(uid).collection("labExtractionDrafts").where("documentId", "==", documentId).get();
    const reviewsAfter = await db.collection("users").doc(uid).collection("labReviews").where("documentId", "==", documentId).get();
    const acceptedAfterDel = await db
      .collection("users")
      .doc(uid)
      .collection("labAcceptedResults")
      .where("sourceDocumentId", "==", documentId)
      .get();
    const docAfter = await db.collection("users").doc(uid).collection("documents").doc(documentId).get();
    record(results, "drafts_removed", draftsAfter.size === 0, `n=${draftsAfter.size}`);
    record(results, "review_removed", reviewsAfter.size === 0, `n=${reviewsAfter.size}`);
    record(results, "accepted_removed", acceptedAfterDel.size === 0, `n=${acceptedAfterDel.size}`);
    record(results, "document_removed_or_tombstoned", !docAfter.exists || String((docAfter.data() as any)?.retentionStatus) === "deleted");

    const unrelatedAfter = await db.collection("users").doc(uid).collection("documents").doc(unrelatedDocumentId).get();
    record(results, "unrelated_report_remains", unrelatedAfter.exists);

    const del2 = await api(
      baseUrl,
      gatewayKey,
      idToken,
      "DELETE",
      `/users/me/documents/${encodeURIComponent(documentId)}`,
    );
    record(results, "second_delete_safe", del2.status === 200 || del2.status === 404 || del2.status === 204, `http_${del2.status}`);

    const staleRoute = await api(
      baseUrl,
      gatewayKey,
      idToken,
      "GET",
      `/users/me/labs/reviews/${encodeURIComponent(documentId)}`,
    );
    record(results, "stale_route_safe", staleRoute.status === 404 || staleRoute.status === 200, `http_${staleRoute.status}`);

    void projectedBeforeDelete;
  } catch (err) {
    record(results, "probe_crash", false, String((err as Error)?.message ?? err).slice(0, 80));
  } finally {
    if (uid) {
      try {
        // Best-effort cleanup of synthetic user data + auth user.
        const cols = [
          "documents",
          "labExtractionDrafts",
          "labReviews",
          "labAcceptedResults",
          "labResults",
          "labUploads",
          "documentIngestionJobs",
          "documentExtractionsFields",
          "accountExports",
        ];
        for (const col of cols) {
          const snap = await db.collection("users").doc(uid).collection(col).limit(200).get();
          for (const doc of snap.docs) await doc.ref.delete().catch(() => undefined);
        }
        await auth.deleteUser(uid).catch(() => undefined);
        record(results, "synthetic_cleanup", true);
      } catch {
        record(results, "synthetic_cleanup", false);
      }
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    JSON.stringify({
      ok: failed.length === 0,
      passed: results.filter((r) => r.ok).length,
      failed: failed.length,
      failedSteps: failed.map((f) => f.step),
    }),
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
