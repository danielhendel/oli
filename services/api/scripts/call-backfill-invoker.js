/**
 * Repro: call POST /integrations/withings/backfill with the same ID-token minting
 * as the scheduler (getIdTokenClient(baseUrl)). Prints only status and error.code.
 * Run from services/api with: OLI_API_BASE_URL=https://oli-api-xxx.run.app node scripts/call-backfill-invoker.js
 * Or: node scripts/call-backfill-invoker.js https://oli-api-xxx.run.app
 * Uses Application Default Credentials (gcloud auth application-default login or GOOGLE_APPLICATION_CREDENTIALS).
 * Do not print token.
 */
const baseUrl = (process.env.OLI_API_BASE_URL || process.argv[2] || "").trim().replace(/\/+$/, "");
if (!baseUrl) {
  console.error("Usage: OLI_API_BASE_URL=<url> node scripts/call-backfill-invoker.js");
  console.error("   or: node scripts/call-backfill-invoker.js <baseUrl>");
  process.exit(1);
}

const url = `${baseUrl}/integrations/withings/backfill`;
const body = { mode: "resume", yearsBack: 10, chunkDays: 90, maxChunks: 5 };

async function main() {
  const { GoogleAuth } = require("google-auth-library");
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(baseUrl);
  let status;
  let errorCode = null;
  try {
    const res = await client.request({
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: body,
    });
    status = res.status;
    if (res.data?.error?.code) errorCode = res.data.error.code;
  } catch (err) {
    status = err.response?.status ?? 0;
    errorCode = err.response?.data?.error?.code ?? null;
  }
  console.log(JSON.stringify({ status, errorCode }));
}

main().catch((err) => {
  console.error(err.message || String(err));
  process.exit(1);
});
