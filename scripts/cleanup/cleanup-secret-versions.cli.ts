#!/usr/bin/env npx tsx
/**
 * One-time Secret Manager version cleanup (metadata only — never prints secret values).
 *
 * Usage (repo root, ADC or GOOGLE_APPLICATION_CREDENTIALS):
 *
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/cleanup/cleanup-secret-versions.cli.ts \
 *     --project-id oli-staging-fdbba \
 *     --secret-id oura-refresh-token-<uid>
 *
 * Dry-run by default. Pass --execute to destroy versions.
 *
 *   ... --keep 1 --execute
 */

import {
  destroyOldSecretVersions,
  listEnabledSecretVersions,
  parseSecretVersionNumber,
} from "../../services/api/src/lib/ouraSecrets.ts";

type CliArgs =
  | "help"
  | "usage"
  | {
      projectId: string;
      secretId: string;
      keep: number;
      execute: boolean;
    };

function parseArgs(argv: string[]): CliArgs {
  let projectId: string | null = null;
  let secretId: string | null = null;
  let keep = 1;
  let execute = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return "help";
    if (arg === "--project-id") projectId = argv[++i]?.trim() ?? null;
    else if (arg === "--secret-id") secretId = argv[++i]?.trim() ?? null;
    else if (arg === "--keep") {
      const parsed = Number.parseInt(argv[++i] ?? "", 10);
      keep = Number.isFinite(parsed) && parsed >= 1 && parsed <= 2 ? parsed : NaN;
    } else if (arg === "--execute") execute = true;
    else if (arg === "--dry-run") execute = false;
  }

  if (!projectId || !secretId) return "usage";
  if (!Number.isFinite(keep) || keep < 1 || keep > 2) return "usage";

  return { projectId, secretId, keep, execute };
}

function printHelp(): void {
  console.log(`cleanup-secret-versions.cli.ts — prune old ENABLED Secret Manager versions.

Required:
  --project-id <gcpProjectId>
  --secret-id <secretId>          e.g. oura-refresh-token-<uid>

Optional:
  --keep <1|2>                    newest versions to retain (default: 1)
  --execute                       destroy versions (default: dry-run)
  --dry-run                       explicit dry-run (default)

Never prints secret payloads. Requires secretmanager.versions.destroy (and list) IAM.
`);
}

function sortNewestFirst(
  versions: { name: string; state: string | null }[],
): { name: string; state: string | null }[] {
  return [...versions].sort((a, b) => {
    const an = parseSecretVersionNumber(a.name) ?? -1;
    const bn = parseSecretVersionNumber(b.name) ?? -1;
    return bn - an;
  });
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (parsed === "help") {
    printHelp();
    return;
  }
  if (parsed === "usage") {
    printHelp();
    console.error("\nError: --project-id and --secret-id are required.");
    process.exit(1);
  }

  const { projectId, secretId, keep, execute } = parsed;

  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT = projectId;

  const enabled = await listEnabledSecretVersions(projectId, secretId);
  const sorted = sortNewestFirst(enabled);
  const keepVersions = sorted.slice(0, keep);
  const destroyVersions = sorted.slice(keep);
  const keepNames = new Set(keepVersions.map((v) => v.name));

  const summary = {
    projectId,
    secretId,
    mode: execute ? "execute" : "dry-run",
    keepCount: keep,
    enabledTotal: enabled.length,
    wouldKeep: keepVersions.map((v) => ({
      name: v.name,
      version: parseSecretVersionNumber(v.name),
    })),
    wouldDestroyCount: destroyVersions.length,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!execute) {
    console.log(
      `\nDry-run only. Re-run with --execute to destroy ${destroyVersions.length} enabled version(s).`,
    );
    return;
  }

  if (destroyVersions.length === 0) {
    console.log("\nNothing to destroy.");
    return;
  }

  const result = await destroyOldSecretVersions(projectId, secretId, keepNames);
  console.log(
    JSON.stringify(
      {
        destroyed: result.destroyed,
        errorsIgnored: result.errorsIgnored,
        kept: keepVersions.length,
      },
      null,
      2,
    ),
  );
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ level: "error", msg: "cleanup_secret_versions_failed", err: message }));
  process.exit(1);
});
