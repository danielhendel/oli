#!/usr/bin/env bash
# scripts/ci/audit-production.sh
#
# Supply-chain hygiene: fail on HIGH/CRITICAL production vulnerabilities unless
# covered by time-boxed exceptions in docs/90_audits/supply-chain-exceptions.json.
# Uses npm audit --omit=dev --json. Report-only mode: REPORT_ONLY=1 (exit 0, print summary).
# See docs/90_audits/SUPPLY_CHAIN_VULNERABILITY_POLICY.md.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "🔒 Production dependency audit (HIGH+ fails unless excepted)…"
exec node scripts/ci/audit-production.mjs
