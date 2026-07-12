import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";
import { createHash } from "crypto";
import { describe, expect, it, beforeAll, afterAll } from "@jest/globals";

const LOGGING_DIR = path.resolve(__dirname, "..");
const SCRIPT = path.join(LOGGING_DIR, "manage-oli-api-request-log-privacy.sh");
const FILTER_FILE = path.join(LOGGING_DIR, "oli-api-request-log-privacy.filter");
const CONSTANTS_FILE = path.join(
  LOGGING_DIR,
  "oli-api-request-log-privacy.constants.sh",
);

const ALLOWED_PROJECT = "oli-staging-fdbba";
const EXCLUSION_NAME = "oli_api_request_metadata_privacy_v1";
const SAFE_EVENT = "http_request_completed";
const LEGACY_MSG = "request";

const ENDPOINTS_LOG_ID =
  "oli-api-0drj1f1cbrv7k.apigateway.oli-staging-fdbba.cloud.goog/endpoints_log";
const ENDPOINTS_SERVICE =
  "oli-api-0drj1f1cbrv7k.apigateway.oli-staging-fdbba.cloud.goog";

function read(p: string): string {
  return fs.readFileSync(p, "utf8");
}

function normalizeWs(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function clauseRequires(clause: string, needles: string[]): boolean {
  return needles.every((n) => clause.includes(n));
}

function splitOrClauses(filter: string): string[] {
  // Split top-level OR groups bounded by parentheses.
  return normalizeWs(filter)
    .split(/\s+OR\s+/)
    .map((c) => c.trim());
}

describe("manage-oli-api-request-log-privacy", () => {
  let scriptSrc = "";
  let filterSrc = "";
  let constantsSrc = "";
  let filterNorm = "";
  let mockGcloud = "";
  let tmpRoot = "";

  beforeAll(() => {
    scriptSrc = read(SCRIPT);
    filterSrc = read(FILTER_FILE);
    constantsSrc = read(CONSTANTS_FILE);
    filterNorm = normalizeWs(filterSrc);
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oli-log-privacy-test-"));
    fs.chmodSync(tmpRoot, 0o700);

    mockGcloud = path.join(tmpRoot, "mock-gcloud");
    fs.writeFileSync(
      mockGcloud,
      `#!/usr/bin/env bash
set -euo pipefail
STATE_DIR="\${MOCK_GCLOUD_STATE_DIR:?}"
mkdir -p "\$STATE_DIR"
echo "\$@" >> "\$STATE_DIR/commands.log"
# Refuse live mutation markers in unit tests by requiring mock state.
case "\$*" in
  *"logging sinks describe _Default"*)
    cat "\$STATE_DIR/default.json"
    ;;
  *"logging sinks describe _Required"*)
    cat "\$STATE_DIR/required.json"
    ;;
  *"logging sinks update _Default"*--add-exclusion*)
    python3 - "\$STATE_DIR" <<'PY'
import json, pathlib, sys
state = pathlib.Path(sys.argv[1])
default = json.loads((state / "default.json").read_text())
excl = {
  "name": "oli_api_request_metadata_privacy_v1",
  "description": "Privacy: prevent storage of Oli API/Gateway request metadata that may contain health-range values, API keys, concrete identifiers, or legacy authenticated request metadata.",
  "filter": (state / "expected_filter_norm.txt").read_text().strip(),
  "disabled": False,
}
default["exclusions"] = list(default.get("exclusions") or []) + [excl]
(state / "default.json").write_text(json.dumps(default))
print("Updated sink [_Default].")
PY
    ;;
  *"logging sinks update _Default"*--remove-exclusions=oli_api_request_metadata_privacy_v1*)
    python3 - "\$STATE_DIR" <<'PY'
import json, pathlib, sys
state = pathlib.Path(sys.argv[1])
default = json.loads((state / "default.json").read_text())
default["exclusions"] = [
  e for e in (default.get("exclusions") or [])
  if e.get("name") != "oli_api_request_metadata_privacy_v1"
]
(state / "default.json").write_text(json.dumps(default))
print("Updated sink [_Default].")
PY
    ;;
  *"logging sinks update"*)
    echo "UNEXPECTED_MUTATION: \$*" >&2
    exit 99
    ;;
  *)
    echo "mock-gcloud unsupported: \$*" >&2
    exit 2
    ;;
esac
`,
      { mode: 0o755 },
    );
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("guards exact staging project and _Default only", () => {
    expect(constantsSrc).toContain(
      `OLI_REQUEST_LOG_PRIVACY_ALLOWED_PROJECT="${ALLOWED_PROJECT}"`,
    );
    expect(constantsSrc).toContain(
      'OLI_REQUEST_LOG_PRIVACY_SINK_NAME="_Default"',
    );
    expect(constantsSrc).toContain(
      'OLI_REQUEST_LOG_PRIVACY_REQUIRED_SINK_NAME="_Required"',
    );
    expect(scriptSrc).toContain("refusing non-staging project");
    expect(scriptSrc).toContain('assert_sink_is_default');
    expect(scriptSrc).toMatch(/\[\[ "\$OLI_REQUEST_LOG_PRIVACY_SINK_NAME" == "_Default" \]\]/);
  });

  it("rejects _Required as mutation target and never clears exclusions", () => {
    expect(scriptSrc).toContain("--add-exclusion=");
    expect(scriptSrc).toContain("--remove-exclusions=");
    expect(scriptSrc).not.toContain("--clear-exclusions");
    expect(scriptSrc).not.toMatch(/sinks update _Required/);
    expect(scriptSrc).toContain("_Required sink changed unexpectedly");
  });

  it("preserves destination, inclusion filter, and enabled state", () => {
    expect(scriptSrc).toContain('f"{field}_changed"');
    expect(scriptSrc).toContain("disabled_changed");
    expect(scriptSrc).toContain("intended_only_change");
    expect(scriptSrc).not.toMatch(/--log-filter=/);
    expect(scriptSrc).not.toMatch(/--destination=/);
    expect(scriptSrc).not.toMatch(/--disabled/);
  });

  it("uses a stable valid exclusion name", () => {
    expect(constantsSrc).toContain(
      `OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME="${EXCLUSION_NAME}"`,
    );
    expect(EXCLUSION_NAME).toMatch(/^[A-Za-z][A-Za-z0-9_]{0,99}$/);
  });

  it("scopes Cloud Run, Gateway, endpoints, and legacy clauses exactly", () => {
    const clauses = splitOrClauses(filterSrc);
    expect(clauses).toHaveLength(4);

    const runClause = clauses.find((c) =>
      c.includes('LOG_ID("run.googleapis.com/requests")'),
    );
    expect(runClause).toBeTruthy();
    expect(
      clauseRequires(runClause!, [
        'resource.type="cloud_run_revision"',
        'resource.labels.service_name="oli-api"',
        'resource.labels.location="us-central1"',
        'LOG_ID("run.googleapis.com/requests")',
      ]),
    ).toBe(true);

    const gwClause = clauses.find((c) =>
      c.includes('LOG_ID("apigateway.googleapis.com/requests")'),
    );
    expect(gwClause).toBeTruthy();
    expect(
      clauseRequires(gwClause!, [
        'resource.type="apigateway.googleapis.com/Gateway"',
        'resource.labels.gateway_id="oli-gateway"',
        'resource.labels.location="us-central1"',
        'LOG_ID("apigateway.googleapis.com/requests")',
      ]),
    ).toBe(true);
    // Must not be an unscoped Gateway LOG_ID-only clause.
    expect(gwClause).toContain("gateway_id");

    const epClause = clauses.find((c) => c.includes(ENDPOINTS_LOG_ID));
    expect(epClause).toBeTruthy();
    expect(
      clauseRequires(epClause!, [
        'resource.type="api"',
        `resource.labels.service="${ENDPOINTS_SERVICE}"`,
        `LOG_ID("${ENDPOINTS_LOG_ID}")`,
      ]),
    ).toBe(true);

    const legacyClause = clauses.find((c) =>
      c.includes(`jsonPayload.msg="${LEGACY_MSG}"`),
    );
    expect(legacyClause).toBeTruthy();
    expect(
      clauseRequires(legacyClause!, [
        'resource.type="cloud_run_revision"',
        'resource.labels.service_name="oli-api"',
        `jsonPayload.msg="${LEGACY_MSG}"`,
      ]),
    ).toBe(true);
  });

  it("does not exclude corrected http_request_completed events", () => {
    expect(filterSrc).not.toContain(SAFE_EVENT);
    expect(filterSrc).not.toContain("http_request_completed");
    expect(filterSrc).not.toContain("operation=");
  });

  it("negative controls: unrelated services/gateways do not satisfy clauses", () => {
    const clauses = splitOrClauses(filterSrc);
    const synthetic = {
      otherRun: {
        type: "cloud_run_revision",
        service_name: "unrelated-service",
        location: "us-central1",
        logId: "run.googleapis.com/requests",
      },
      otherGw: {
        type: "apigateway.googleapis.com/Gateway",
        gateway_id: "other-gateway",
        location: "us-central1",
        logId: "apigateway.googleapis.com/requests",
      },
      safeApp: {
        type: "cloud_run_revision",
        service_name: "oli-api",
        operation: SAFE_EVENT,
      },
    };

    const runClause = clauses.find((c) =>
      c.includes('LOG_ID("run.googleapis.com/requests")'),
    )!;
    expect(runClause.includes(`service_name="${synthetic.otherRun.service_name}"`)).toBe(
      false,
    );
    expect(runClause.includes('service_name="oli-api"')).toBe(true);

    const gwClause = clauses.find((c) =>
      c.includes('LOG_ID("apigateway.googleapis.com/requests")'),
    )!;
    expect(gwClause.includes(`gateway_id="${synthetic.otherGw.gateway_id}"`)).toBe(
      false,
    );
    expect(gwClause.includes('gateway_id="oli-gateway"')).toBe(true);

    // Safe future app event is not in any clause.
    for (const c of clauses) {
      expect(c).not.toContain(SAFE_EVENT);
    }
  });

  it("never prints logs and never embeds sensitive query values", () => {
    const corpus = [scriptSrc, filterSrc, constantsSrc].join("\n");
    expect(corpus).not.toMatch(/gcloud logging read/);
    expect(corpus).not.toMatch(/\bstart=\d{4}-\d{2}-\d{2}\b/);
    expect(corpus).not.toMatch(/\bend=\d{4}-\d{2}-\d{2}\b/);
    expect(corpus).not.toMatch(/[?&]key=/);
    expect(corpus).not.toMatch(/api[_-]?key\s*[:=]\s*["']?[A-Za-z0-9_\-]{8,}/i);
    expect(corpus).not.toMatch(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/);
    expect(scriptSrc).not.toContain("httpRequest.requestUrl");
    expect(scriptSrc).toContain("Privacy-safe structured status lines only");
  });

  it("computes a stable normalized filter hash", () => {
    expect(sha256(filterNorm)).toHaveLength(64);
    expect(sha256(filterNorm)).toBe(sha256(normalizeWs(filterSrc)));
  });

  function seedMockState(opts?: {
    existingExclusionFilter?: string;
    extraExclusion?: { name: string; filter: string };
  }) {
    const stateDir = fs.mkdtempSync(path.join(tmpRoot, "state-"));
    fs.chmodSync(stateDir, 0o700);
    const defaultSink: Record<string, unknown> = {
      name: "_Default",
      destination: "logging.googleapis.com/projects/oli-staging-fdbba/locations/global/buckets/_Default",
      filter: "NOT LOG_ID(\"cloudaudit.googleapis.com/activity\")",
      disabled: false,
      writerIdentity: "serviceAccount:mock-writer@example.iam.gserviceaccount.com",
      exclusions: [] as Array<Record<string, unknown>>,
    };
    if (opts?.existingExclusionFilter) {
      (defaultSink.exclusions as Array<Record<string, unknown>>).push({
        name: EXCLUSION_NAME,
        description: "Privacy: prevent storage of Oli API/Gateway request metadata that may contain health-range values, API keys, concrete identifiers, or legacy authenticated request metadata.",
        filter: opts.existingExclusionFilter,
        disabled: false,
      });
    }
    if (opts?.extraExclusion) {
      (defaultSink.exclusions as Array<Record<string, unknown>>).push({
        name: opts.extraExclusion.name,
        description: "preexisting",
        filter: opts.extraExclusion.filter,
        disabled: false,
      });
    }
    const requiredSink = {
      name: "_Required",
      destination: "logging.googleapis.com/projects/oli-staging-fdbba/locations/global/buckets/_Required",
      filter: "LOG_ID(\"cloudaudit.googleapis.com/activity\") OR LOG_ID(\"cloudaudit.googleapis.com/system_event\")",
      disabled: false,
      exclusions: [],
    };
    fs.writeFileSync(path.join(stateDir, "default.json"), JSON.stringify(defaultSink));
    fs.writeFileSync(path.join(stateDir, "required.json"), JSON.stringify(requiredSink));
    fs.writeFileSync(path.join(stateDir, "expected_filter_norm.txt"), filterNorm);
    return stateDir;
  }

  function runScript(
    mode: string,
    stateDir: string,
    backupDir: string,
    project = ALLOWED_PROJECT,
  ) {
    fs.chmodSync(backupDir, 0o700);
    return spawnSync(
      "bash",
      [SCRIPT, mode, "--project", project, "--backup-dir", backupDir],
      {
        env: {
          ...process.env,
          GCLOUD_BIN: mockGcloud,
          MOCK_GCLOUD_STATE_DIR: stateDir,
        },
        encoding: "utf8",
      },
    );
  }

  it("refuses empty / wrong project", () => {
    const stateDir = seedMockState();
    const backupDir = fs.mkdtempSync(path.join(tmpRoot, "backup-"));
    fs.chmodSync(backupDir, 0o700);
    const empty = spawnSync("bash", [SCRIPT, "plan", "--backup-dir", backupDir], {
      env: { ...process.env, GCLOUD_BIN: mockGcloud, MOCK_GCLOUD_STATE_DIR: stateDir },
      encoding: "utf8",
    });
    expect(empty.status).not.toBe(0);

    const wrong = runScript("plan", stateDir, backupDir, "oli-prod-not-allowed");
    expect(wrong.status).not.toBe(0);
    expect(wrong.stderr).toContain("refusing non-staging project");
  });

  it("same-name/same-filter is idempotent; different-filter fails", () => {
    const backupDir = fs.mkdtempSync(path.join(tmpRoot, "backup-"));
    fs.chmodSync(backupDir, 0o700);

    const same = seedMockState({ existingExclusionFilter: filterNorm });
    const sameRes = runScript("apply", same, backupDir);
    expect(sameRes.status).toBe(0);
    expect(sameRes.stdout).toContain("result=idempotent_noop");

    const driftBackup = fs.mkdtempSync(path.join(tmpRoot, "backup-"));
    fs.chmodSync(driftBackup, 0o700);
    const drift = seedMockState({
      existingExclusionFilter: 'resource.type="cloud_run_revision"',
    });
    const driftRes = runScript("apply", drift, driftBackup);
    expect(driftRes.status).not.toBe(0);
    expect(driftRes.stderr).toContain("same-name/different-filter");
  });

  it("apply adds only the intended exclusion and rollback restores pre-spec", () => {
    const stateDir = seedMockState({
      extraExclusion: {
        name: "keep_me",
        filter: 'resource.type="gce_instance"',
      },
    });
    const backupDir = fs.mkdtempSync(path.join(tmpRoot, "backup-"));
    fs.chmodSync(backupDir, 0o700);

    const plan = runScript("plan", stateDir, backupDir);
    expect(plan.status).toBe(0);
    expect(plan.stdout).toContain(`exclusion_name=${EXCLUSION_NAME}`);
    expect(plan.stdout).toContain("intended_action=add_exclusion");
    expect(plan.stdout).toMatch(/filter_hash=[a-f0-9]{64}/);
    expect(fs.statSync(path.join(backupDir, "_Default.pre.json")).mode & 0o777).toBe(
      0o600,
    );

    const apply = runScript("apply", stateDir, backupDir);
    expect(apply.status).toBe(0);
    expect(apply.stdout).toContain("result=applied");
    expect(apply.stdout).toContain("intended_only_change=true");

    const cmds = read(path.join(stateDir, "commands.log"));
    expect(cmds).toContain("--add-exclusion=");
    expect(cmds).not.toContain("--clear-exclusions");

    const verify = runScript("verify", stateDir, backupDir);
    expect(verify.status).toBe(0);
    expect(verify.stdout).toContain("result=verified");

    const post = JSON.parse(read(path.join(stateDir, "default.json")));
    const names = (post.exclusions as Array<{ name: string }>).map((e) => e.name).sort();
    expect(names).toEqual(["keep_me", EXCLUSION_NAME].sort());

    const rollback = runScript("rollback", stateDir, backupDir);
    expect(rollback.status).toBe(0);
    expect(rollback.stdout).toContain("result=rolled_back");
    const after = JSON.parse(read(path.join(stateDir, "default.json")));
    const afterNames = (after.exclusions as Array<{ name: string }>).map((e) => e.name);
    expect(afterNames).toEqual(["keep_me"]);
    expect(read(path.join(stateDir, "commands.log"))).toContain(
      `--remove-exclusions=${EXCLUSION_NAME}`,
    );
  });

  it("unit tests never invoke a real gcloud binary", () => {
    expect(mockGcloud).not.toMatch(/(^|\/)gcloud$/);
    expect(fs.readFileSync(mockGcloud, "utf8")).toContain("MOCK_GCLOUD_STATE_DIR");
  });
});
