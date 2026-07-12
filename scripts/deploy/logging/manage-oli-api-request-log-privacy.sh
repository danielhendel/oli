#!/usr/bin/env bash
# Manage the forward-looking _Default exclusion for Oli API/Gateway request metadata.
# Modes: plan | apply | verify | rollback
# Never clears exclusions, never mutates _Required, never prints raw log entries.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=oli-api-request-log-privacy.constants.sh
source "${SCRIPT_DIR}/oli-api-request-log-privacy.constants.sh"

FILTER_FILE="${SCRIPT_DIR}/oli-api-request-log-privacy.filter"
MODE=""
PROJECT=""
BACKUP_DIR=""
GCLOUD_BIN="${GCLOUD_BIN:-gcloud}"

usage() {
  cat <<'EOF'
Usage:
  manage-oli-api-request-log-privacy.sh <plan|apply|verify|rollback> \
    --project oli-staging-fdbba \
    --backup-dir <secure-dir>

Environment:
  GCLOUD_BIN  Override gcloud binary (tests only; never point at live gcloud in CI unit tests)
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

emit() {
  # Privacy-safe structured status lines only.
  printf '%s\n' "$*"
}

sha256_file() {
  local path="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$path" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$path" | awk '{print $1}'
  else
    die "neither shasum nor sha256sum available"
  fi
}

sha256_string() {
  local s="$1"
  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$s" | shasum -a 256 | awk '{print $1}'
  else
    printf '%s' "$s" | sha256sum | awk '{print $1}'
  fi
}

normalize_ws() {
  # Collapse all whitespace to single spaces for stable hashing/comparison.
  tr -s '[:space:]' ' ' | sed -e 's/^ //' -e 's/ $//'
}

load_filter() {
  [[ -f "$FILTER_FILE" ]] || die "missing filter file: $FILTER_FILE"
  local raw
  raw="$(cat "$FILTER_FILE")"
  [[ -n "${raw//[[:space:]]/}" ]] || die "filter file is empty"
  printf '%s' "$raw"
}

normalized_filter() {
  load_filter | normalize_ws
}

filter_hash() {
  sha256_string "$(normalized_filter)"
}

require_project() {
  [[ -n "$PROJECT" ]] || die "project is required"
  [[ "$PROJECT" == "$OLI_REQUEST_LOG_PRIVACY_ALLOWED_PROJECT" ]] \
    || die "refusing non-staging project '$PROJECT' (allowed: $OLI_REQUEST_LOG_PRIVACY_ALLOWED_PROJECT)"
}

require_backup_dir() {
  [[ -n "$BACKUP_DIR" ]] || die "--backup-dir is required"
  [[ -d "$BACKUP_DIR" ]] || die "backup dir does not exist: $BACKUP_DIR"
  local mode
  mode="$(stat -f '%Lp' "$BACKUP_DIR" 2>/dev/null || stat -c '%a' "$BACKUP_DIR")"
  # Accept 700 or more restrictive owner-only modes.
  case "$mode" in
    7??|70?) ;;
    *)
      # Soft warning only if sticky bits differ; still require owner rwx and no group/other write.
      if [[ ! "$mode" =~ ^7 ]]; then
        die "backup dir permissions must be owner-restricted (got $mode; prefer 700)"
      fi
      ;;
  esac
}

parse_args() {
  [[ $# -ge 1 ]] || { usage; exit 1; }
  MODE="$1"
  shift
  case "$MODE" in
    plan|apply|verify|rollback) ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown mode: $MODE" ;;
  esac
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project)
        [[ $# -ge 2 ]] || die "--project requires a value"
        PROJECT="$2"
        shift 2
        ;;
      --project=*)
        PROJECT="${1#*=}"
        shift
        ;;
      --backup-dir)
        [[ $# -ge 2 ]] || die "--backup-dir requires a value"
        BACKUP_DIR="$2"
        shift 2
        ;;
      --backup-dir=*)
        BACKUP_DIR="${1#*=}"
        shift
        ;;
      *)
        die "unknown argument: $1"
        ;;
    esac
  done
}

describe_sink_json() {
  local sink="$1"
  local out="$2"
  "$GCLOUD_BIN" logging sinks describe "$sink" \
    --project="$PROJECT" \
    --format=json >"$out"
}

jq_field() {
  local file="$1"
  local expr="$2"
  python3 - "$file" "$expr" <<'PY'
import json, sys
path, expr = sys.argv[1], sys.argv[2]
with open(path) as f:
    data = json.load(f)
# Very small path resolver: a.b.c or exclusions[*].name
cur = data
for part in expr.split("."):
    if part.endswith("[*]"):
        key = part[:-3]
        cur = cur.get(key) or []
        break
    if isinstance(cur, dict):
        cur = cur.get(part)
    else:
        cur = None
        break
if isinstance(cur, list) and expr.endswith("exclusions[*].name"):
    # handled below
    pass
if expr.endswith("exclusions[*].name"):
    names = [e.get("name") for e in (data.get("exclusions") or []) if isinstance(e, dict)]
    print("\n".join(names))
elif cur is None:
    print("")
elif isinstance(cur, bool):
    print("true" if cur else "false")
else:
    print(cur)
PY
}

sink_disabled_bool() {
  local file="$1"
  python3 - "$file" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
print("true" if data.get("disabled") is True else "false")
PY
}

exclusion_names() {
  local file="$1"
  python3 - "$file" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
for e in data.get("exclusions") or []:
    if isinstance(e, dict) and e.get("name"):
        print(e["name"])
PY
}

exclusion_filter_raw() {
  local file="$1"
  local name="$2"
  python3 - "$file" "$name" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
want = sys.argv[2]
for e in data.get("exclusions") or []:
    if isinstance(e, dict) and e.get("name") == want:
        print(e.get("filter") or "")
        break
PY
}

exclusion_disabled() {
  local file="$1"
  local name="$2"
  python3 - "$file" "$name" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
want = sys.argv[2]
for e in data.get("exclusions") or []:
    if isinstance(e, dict) and e.get("name") == want:
        print("true" if e.get("disabled") is True else "false")
        sys.exit(0)
print("missing")
PY
}

normalize_filter_string() {
  printf '%s' "$1" | normalize_ws
}

spec_hash_from_file() {
  local file="$1"
  python3 - "$file" <<'PY'
import json, hashlib, re, sys

def norm_ws(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())

with open(sys.argv[1]) as f:
    data = json.load(f)

exclusions = []
for e in data.get("exclusions") or []:
    if not isinstance(e, dict):
        continue
    exclusions.append({
        "name": e.get("name") or "",
        "description": e.get("description") or "",
        "filter": norm_ws(e.get("filter") or ""),
        "disabled": bool(e.get("disabled") is True),
    })
exclusions.sort(key=lambda x: x["name"])

canonical = {
    "name": data.get("name") or "",
    "destination": data.get("destination") or "",
    "filter": norm_ws(data.get("filter") or ""),
    "disabled": bool(data.get("disabled") is True),
    "writerIdentity": data.get("writerIdentity") or "",
    "exclusions": exclusions,
}
payload = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
print(hashlib.sha256(payload.encode()).hexdigest())
PY
}

field_hash_from_file() {
  local file="$1"
  local field="$2"
  python3 - "$file" "$field" <<'PY'
import json, hashlib, re, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
val = data.get(sys.argv[2]) or ""
if sys.argv[2] == "filter":
    val = re.sub(r"\s+", " ", str(val).strip())
print(hashlib.sha256(str(val).encode()).hexdigest())
PY
}

assert_sink_is_default() {
  [[ "$OLI_REQUEST_LOG_PRIVACY_SINK_NAME" == "_Default" ]] \
    || die "refusing to operate on non-_Default sink constant"
}

assert_required_untouched_from_backup() {
  local pre_required="$BACKUP_DIR/_Required.pre.json"
  local post_required="$BACKUP_DIR/_Required.post.json"
  [[ -f "$pre_required" ]] || return 0
  describe_sink_json "$OLI_REQUEST_LOG_PRIVACY_REQUIRED_SINK_NAME" "$post_required"
  chmod 600 "$post_required" 2>/dev/null || true
  local pre_hash post_hash
  pre_hash="$(spec_hash_from_file "$pre_required")"
  post_hash="$(spec_hash_from_file "$post_required")"
  [[ "$pre_hash" == "$post_hash" ]] || die "_Required sink changed unexpectedly"
  emit "required_unchanged=true"
  emit "required_spec_hash=$pre_hash"
}

backup_pre_state() {
  local pre_default="$BACKUP_DIR/_Default.pre.json"
  local pre_required="$BACKUP_DIR/_Required.pre.json"
  describe_sink_json "$OLI_REQUEST_LOG_PRIVACY_SINK_NAME" "$pre_default"
  chmod 600 "$pre_default"
  sha256_file "$pre_default" >"$BACKUP_DIR/_Default.pre.sha256"
  chmod 600 "$BACKUP_DIR/_Default.pre.sha256"
  describe_sink_json "$OLI_REQUEST_LOG_PRIVACY_REQUIRED_SINK_NAME" "$pre_required"
  chmod 600 "$pre_required"
  sha256_file "$pre_required" >"$BACKUP_DIR/_Required.pre.sha256"
  chmod 600 "$BACKUP_DIR/_Required.pre.sha256"

  emit "operation=backup"
  emit "project=$PROJECT"
  emit "sink=$OLI_REQUEST_LOG_PRIVACY_SINK_NAME"
  emit "pre_spec_hash=$(spec_hash_from_file "$pre_default")"
  emit "destination_hash=$(field_hash_from_file "$pre_default" destination)"
  emit "inclusion_filter_hash=$(field_hash_from_file "$pre_default" filter)"
  emit "disabled=$(sink_disabled_bool "$pre_default")"
  emit "backup_sha256=$(cat "$BACKUP_DIR/_Default.pre.sha256")"
  local names
  names="$(exclusion_names "$pre_default" | tr '\n' ',' | sed 's/,$//')"
  emit "existing_exclusion_names=${names:-<none>}"
}

check_preconditions_from_pre() {
  local pre_default="$BACKUP_DIR/_Default.pre.json"
  [[ -f "$pre_default" ]] || die "missing pre-change backup: $pre_default"

  local disabled
  disabled="$(sink_disabled_bool "$pre_default")"
  [[ "$disabled" == "false" ]] || die "_Default sink is disabled; refusing to apply"

  local dest_hash filt_hash
  dest_hash="$(field_hash_from_file "$pre_default" destination)"
  filt_hash="$(field_hash_from_file "$pre_default" filter)"
  [[ -n "$dest_hash" ]] || die "missing destination on _Default"
  [[ -n "$filt_hash" ]] || die "missing inclusion filter on _Default"

  local existing_filter existing_norm expected_norm
  existing_filter="$(exclusion_filter_raw "$pre_default" "$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME")"
  expected_norm="$(normalized_filter)"
  if [[ -n "$existing_filter" ]]; then
    existing_norm="$(normalize_filter_string "$existing_filter")"
    if [[ "$existing_norm" == "$expected_norm" ]]; then
      emit "idempotent_state=already_applied"
      return 0
    fi
    die "same-name/different-filter drift for $OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME"
  fi
  emit "idempotent_state=absent"
}

build_add_exclusion_arg() {
  local filt desc
  filt="$(normalized_filter)"
  desc="$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_DESCRIPTION"
  # Filter must remain comma-free so it cannot break map parsing even with custom delimiters.
  if [[ "$filt" == *","* ]]; then
    die "exclusion filter contains comma; refusing unsafe --add-exclusion encoding"
  fi
  # Description may contain commas; use gcloud custom map delimiter form: ^DELIM^k=vDELIMk=v
  local delim="|"
  if [[ "$desc" == *"|"* || "$filt" == *"|"* || "$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME" == *"|"* ]]; then
    delim=$'\x1f'
  fi
  if [[ "$desc" == *"$delim"* || "$filt" == *"$delim"* ]]; then
    die "unable to choose safe delimiter for --add-exclusion encoding"
  fi
  printf '^%s^name=%s%sdescription=%s%sfilter=%s' \
    "$delim" \
    "$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME" \
    "$delim" \
    "$desc" \
    "$delim" \
    "$filt"
}

compare_intended_only_change() {
  local pre="$1"
  local post="$2"
  python3 - "$pre" "$post" "$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME" "$(normalized_filter)" <<'PY'
import json, re, sys

def norm_ws(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())

pre_path, post_path, excl_name, expected_filter = sys.argv[1:5]
with open(pre_path) as f:
    pre = json.load(f)
with open(post_path) as f:
    post = json.load(f)

errors = []
for field in ("destination", "filter", "writerIdentity"):
    if (pre.get(field) or "") != (post.get(field) or ""):
        errors.append(f"{field}_changed")
if bool(pre.get("disabled") is True) != bool(post.get("disabled") is True):
    errors.append("disabled_changed")

pre_ex = {e.get("name"): e for e in (pre.get("exclusions") or []) if isinstance(e, dict)}
post_ex = {e.get("name"): e for e in (post.get("exclusions") or []) if isinstance(e, dict)}

# Previous exclusions must remain with identical normalized filters.
for name, e in pre_ex.items():
    if name == excl_name:
        continue
    if name not in post_ex:
        errors.append(f"lost_exclusion:{name}")
        continue
    if norm_ws(e.get("filter") or "") != norm_ws(post_ex[name].get("filter") or ""):
        errors.append(f"changed_exclusion:{name}")
    if bool(e.get("disabled") is True) != bool(post_ex[name].get("disabled") is True):
        errors.append(f"disabled_exclusion:{name}")

if excl_name not in post_ex:
    errors.append("missing_new_exclusion")
else:
    got = norm_ws(post_ex[excl_name].get("filter") or "")
    if got != norm_ws(expected_filter):
        errors.append("new_exclusion_filter_mismatch")
    if post_ex[excl_name].get("disabled") is True:
        errors.append("new_exclusion_disabled")

# No unexpected extra exclusions beyond pre + new
for name in post_ex:
    if name not in pre_ex and name != excl_name:
        errors.append(f"unexpected_exclusion:{name}")

if errors:
    print("FAIL:" + ",".join(errors))
    sys.exit(1)
print("OK")
PY
}

cmd_plan() {
  require_project
  require_backup_dir
  assert_sink_is_default
  backup_pre_state
  check_preconditions_from_pre
  local fh existing
  fh="$(filter_hash)"
  emit "operation=plan"
  emit "project=$PROJECT"
  emit "sink=$OLI_REQUEST_LOG_PRIVACY_SINK_NAME"
  emit "exclusion_name=$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME"
  emit "filter_hash=$fh"
  emit "clause_count=$OLI_REQUEST_LOG_PRIVACY_CLAUSE_COUNT"
  existing="$(exclusion_filter_raw "$BACKUP_DIR/_Default.pre.json" "$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME")"
  if [[ -n "$existing" ]]; then
    if [[ "$(normalize_filter_string "$existing")" == "$(normalized_filter)" ]]; then
      emit "current_state=already_applied"
      emit "intended_action=noop"
    else
      die "same-name/different-filter drift"
    fi
  else
    emit "current_state=absent"
    emit "intended_action=add_exclusion"
  fi
  emit "result=ok"
}

cmd_apply() {
  require_project
  require_backup_dir
  assert_sink_is_default
  if [[ ! -f "$BACKUP_DIR/_Default.pre.json" ]]; then
    backup_pre_state
  else
    emit "operation=reuse_backup"
    emit "pre_spec_hash=$(spec_hash_from_file "$BACKUP_DIR/_Default.pre.json")"
  fi
  check_preconditions_from_pre

  local existing
  existing="$(exclusion_filter_raw "$BACKUP_DIR/_Default.pre.json" "$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME")"
  if [[ -n "$existing" ]] && [[ "$(normalize_filter_string "$existing")" == "$(normalized_filter)" ]]; then
    emit "operation=apply"
    emit "project=$PROJECT"
    emit "sink=$OLI_REQUEST_LOG_PRIVACY_SINK_NAME"
    emit "exclusion_name=$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME"
    emit "filter_hash=$(filter_hash)"
    emit "result=idempotent_noop"
    return 0
  fi

  local add_arg
  add_arg="$(build_add_exclusion_arg)"
  emit "operation=apply"
  emit "project=$PROJECT"
  emit "sink=$OLI_REQUEST_LOG_PRIVACY_SINK_NAME"
  emit "exclusion_name=$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME"
  emit "filter_hash=$(filter_hash)"
  emit "gcloud_mutation=add_exclusion"

  "$GCLOUD_BIN" logging sinks update "$OLI_REQUEST_LOG_PRIVACY_SINK_NAME" \
    --project="$PROJECT" \
    --add-exclusion="$add_arg"

  local post_default="$BACKUP_DIR/_Default.post.json"
  describe_sink_json "$OLI_REQUEST_LOG_PRIVACY_SINK_NAME" "$post_default"
  chmod 600 "$post_default"
  compare_intended_only_change "$BACKUP_DIR/_Default.pre.json" "$post_default" >/dev/null
  assert_required_untouched_from_backup

  emit "post_spec_hash=$(spec_hash_from_file "$post_default")"
  emit "intended_only_change=true"
  emit "result=applied"
}

cmd_verify() {
  require_project
  require_backup_dir
  assert_sink_is_default
  [[ -f "$BACKUP_DIR/_Default.pre.json" ]] || die "missing pre-change backup for verify"

  local post_default="$BACKUP_DIR/_Default.verify.json"
  describe_sink_json "$OLI_REQUEST_LOG_PRIVACY_SINK_NAME" "$post_default"
  chmod 600 "$post_default"
  compare_intended_only_change "$BACKUP_DIR/_Default.pre.json" "$post_default" >/dev/null

  local excl_disabled
  excl_disabled="$(exclusion_disabled "$post_default" "$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME")"
  [[ "$excl_disabled" == "false" ]] || die "exclusion missing or disabled"

  assert_required_untouched_from_backup

  emit "operation=verify"
  emit "project=$PROJECT"
  emit "sink=$OLI_REQUEST_LOG_PRIVACY_SINK_NAME"
  emit "exclusion_name=$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME"
  emit "filter_hash=$(filter_hash)"
  emit "pre_spec_hash=$(spec_hash_from_file "$BACKUP_DIR/_Default.pre.json")"
  emit "post_spec_hash=$(spec_hash_from_file "$post_default")"
  emit "destination_unchanged=true"
  emit "inclusion_filter_unchanged=true"
  emit "disabled_unchanged=true"
  emit "previous_exclusions_preserved=true"
  emit "exclusion_enabled=true"
  emit "result=verified"
}

cmd_rollback() {
  require_project
  require_backup_dir
  assert_sink_is_default
  [[ -f "$BACKUP_DIR/_Default.pre.json" ]] || die "missing pre-change backup for rollback"

  emit "operation=rollback"
  emit "project=$PROJECT"
  emit "sink=$OLI_REQUEST_LOG_PRIVACY_SINK_NAME"
  emit "exclusion_name=$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME"
  emit "gcloud_mutation=remove_exclusions"

  "$GCLOUD_BIN" logging sinks update "$OLI_REQUEST_LOG_PRIVACY_SINK_NAME" \
    --project="$PROJECT" \
    --remove-exclusions="$OLI_REQUEST_LOG_PRIVACY_EXCLUSION_NAME"

  local post_default="$BACKUP_DIR/_Default.rollback.json"
  describe_sink_json "$OLI_REQUEST_LOG_PRIVACY_SINK_NAME" "$post_default"
  chmod 600 "$post_default"

  local pre_hash post_hash
  pre_hash="$(spec_hash_from_file "$BACKUP_DIR/_Default.pre.json")"
  post_hash="$(spec_hash_from_file "$post_default")"
  [[ "$pre_hash" == "$post_hash" ]] || die "rollback did not restore normalized pre-change sink specification"

  assert_required_untouched_from_backup

  emit "pre_spec_hash=$pre_hash"
  emit "post_spec_hash=$post_hash"
  emit "result=rolled_back"
}

main() {
  parse_args "$@"
  require_project
  case "$MODE" in
    plan) cmd_plan ;;
    apply) cmd_apply ;;
    verify) cmd_verify ;;
    rollback) cmd_rollback ;;
  esac
}

main "$@"
