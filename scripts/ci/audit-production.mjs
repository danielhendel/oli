#!/usr/bin/env node
/**
 * Production dependency audit: fail on HIGH/CRITICAL unless covered by
 * time-boxed exceptions in docs/90_audits/supply-chain-exceptions.json.
 * Uses npm audit --omit=dev --json; no extra network.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXCEPTIONS_PATH = path.join(ROOT, "docs", "90_audits", "supply-chain-exceptions.json");
const REPORT_ONLY = process.env.REPORT_ONLY === "1" || process.env.REPORT_ONLY === "true";

function extractAdvisoryId(url) {
  if (typeof url !== "string") return null;
  const m = url.match(/GHSA-[a-z0-9-]+/i);
  return m ? m[0] : null;
}

function todayYYYYMMDD() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/** Collect all HIGH/CRITICAL findings from audit report. */
function collectFindings(report) {
  const findings = [];
  const vulns = report.vulnerabilities || {};
  for (const [pkg, info] of Object.entries(vulns)) {
    const severity = (info.severity || "").toLowerCase();
    if (severity !== "high" && severity !== "critical") continue;

    const via = info.via || [];
    const seen = new Set();
    for (const v of via) {
      if (typeof v === "string") {
        const key = `${pkg}:${severity}:${v}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({ package: pkg, severity, advisoryId: null });
      } else if (v && typeof v === "object") {
        const advisoryId = extractAdvisoryId(v.url) || null;
        const key = advisoryId || `${pkg}:${severity}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({ package: v.name || pkg, severity: (v.severity || severity).toLowerCase(), advisoryId });
      }
    }
    if (via.length === 0) findings.push({ package: pkg, severity, advisoryId: null });
  }
  return findings;
}

/** Load exceptions; validate expiresOn present and format. */
function loadExceptions() {
  if (!fs.existsSync(EXCEPTIONS_PATH)) return { exceptions: [] };
  const raw = JSON.parse(fs.readFileSync(EXCEPTIONS_PATH, "utf8"));
  const list = Array.isArray(raw.exceptions) ? raw.exceptions : [];
  const today = todayYYYYMMDD();
  return {
    exceptions: list.map((ex) => ({
      ...ex,
      expiresOn: ex.expiresOn || "",
    })),
    today,
  };
}

/** Check if a finding is covered by a non-expired exception. expiresOn is required. */
function isCovered(finding, exceptions, today) {
  return exceptions.some((ex) => {
    if (!ex.expiresOn || ex.expiresOn < today) return false;
    const severityMatch = (ex.severity || "").toLowerCase() === finding.severity;
    const pkgMatch = ex.package === finding.package;
    const advisoryMatch = ex.advisoryId
      ? ex.advisoryId === finding.advisoryId
      : true;
    return pkgMatch && severityMatch && advisoryMatch;
  });
}

function main() {
  const run = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  let report;
  try {
    report = JSON.parse(run.stdout || "{}");
  } catch {
    console.error("audit-production: failed to parse npm audit output");
    process.exit(REPORT_ONLY ? 0 : 1);
  }

  const findings = collectFindings(report);
  const { exceptions, today } = loadExceptions();

  if (findings.length === 0) {
    console.log("✅ Production audit passed (no HIGH/CRITICAL in production deps).");
    process.exit(0);
  }

  const covered = findings.filter((f) => isCovered(f, exceptions, today));
  const uncovered = findings.filter((f) => !isCovered(f, exceptions, today));
  const expired = exceptions.filter((ex) => ex.expiresOn && ex.expiresOn < today);
  const missingExpiry = exceptions.filter((ex) => !ex.expiresOn);

  if (REPORT_ONLY) {
    console.log("AUDIT REPORT (report-only; exit 0)");
    console.log(`Findings (HIGH/CRITICAL): ${findings.length}`);
    findings.forEach((f) => console.log(`  - ${f.package} ${f.severity} ${f.advisoryId || "(no advisory)"}`));
    console.log(`Covered by exceptions: ${covered.length}`);
    console.log(`Uncovered: ${uncovered.length}`);
    process.exit(0);
  }

  if (uncovered.length > 0) {
    console.error("❌ Production audit failed: HIGH/CRITICAL not covered by valid exceptions.\n");
    uncovered.forEach((f) => {
      console.error(`  - ${f.package} (${f.severity}) ${f.advisoryId ? `advisory ${f.advisoryId}` : "no advisory id"}`);
    });
    console.error("\nAdd or extend entries in docs/90_audits/supply-chain-exceptions.json (expiresOn required).");
    process.exit(1);
  }

  if (missingExpiry.length > 0) {
    console.error("❌ Production audit failed: one or more exceptions lack required expiresOn.\n");
    missingExpiry.forEach((ex) => console.error(`  - ${ex.package} ${ex.advisoryId || ""}`));
    console.error("\nAdd expiresOn (YYYY-MM-DD) to all entries in docs/90_audits/supply-chain-exceptions.json.");
    process.exit(1);
  }

  if (expired.length > 0) {
    console.error("❌ Production audit failed: one or more exceptions have expired (expiresOn < today).\n");
    expired.forEach((ex) => {
      console.error(`  - ${ex.package} ${ex.advisoryId || ""} expired ${ex.expiresOn}`);
    });
    console.error("\nUpdate or remove expired entries in docs/90_audits/supply-chain-exceptions.json.");
    process.exit(1);
  }

  console.warn("AUDIT WARN: allowed by exception(s). All HIGH/CRITICAL findings are covered by non-expired exceptions.");
  covered.forEach((f) => {
    console.warn(`  - ${f.package} (${f.severity}) ${f.advisoryId || ""}`);
  });
  process.exit(0);
}

main();
