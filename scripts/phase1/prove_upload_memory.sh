#!/usr/bin/env bash
set -euo pipefail

: "${API_BASE_URL:?Set API_BASE_URL}"
: "${ID_TOKEN:?Set ID_TOKEN}"
: "${IDEMPOTENCY_KEY:?Set IDEMPOTENCY_KEY}"
: "${UPLOAD_FILE:?Set UPLOAD_FILE}"

RAW_EVENT_READ_PATH="${RAW_EVENT_READ_PATH:-/users/me/rawEvents}"

echo "== Phase 1 Proof: Upload -> RawEvent =="

if [ ! -f "$UPLOAD_FILE" ]; then
  echo "UPLOAD_FILE not found: $UPLOAD_FILE"
  exit 1
fi

FILENAME="$(basename "$UPLOAD_FILE")"
MIME_TYPE="$(file -b --mime-type "$UPLOAD_FILE")"
FILE_B64="$(base64 < "$UPLOAD_FILE" | tr -d '\n')"

UPLOAD_RESP="$(
  curl -sS -X POST "${API_BASE_URL%/}/uploads" \
    -H "Authorization: Bearer ${ID_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
    --data-binary "$(jq -n \
      --arg fileBase64 "$FILE_B64" \
      --arg filename "$FILENAME" \
      --arg mimeType "$MIME_TYPE" \
      '{fileBase64:$fileBase64, filename:$filename, mimeType:$mimeType}')"
)"

echo "$UPLOAD_RESP" | jq .

RAW_EVENT_ID="$(echo "$UPLOAD_RESP" | jq -r '.rawEventId // empty')"
OK="$(echo "$UPLOAD_RESP" | jq -r '.ok // empty')"

if [ "$OK" != "true" ] || [ -z "$RAW_EVENT_ID" ]; then
  echo "Upload did not return ok:true and rawEventId."
  exit 1
fi

echo "rawEventId: $RAW_EVENT_ID"

if [ -n "$RAW_EVENT_READ_PATH" ]; then
  RAW_RESP="$(
    curl -sS "${API_BASE_URL%/}${RAW_EVENT_READ_PATH%/}/${RAW_EVENT_ID}" \
      -H "Authorization: Bearer ${ID_TOKEN}" \
      -H "Content-Type: application/json"
  )"

  # Fail-closed: ensure the RawEvent read returned JSON before piping to jq
  if ! echo "$RAW_RESP" | jq -e . >/dev/null 2>&1; then
    echo "RawEvent read did not return JSON (check RAW_EVENT_READ_PATH / auth / server)."
    echo "$RAW_RESP" | sed -n '1,80p'
    exit 1
  fi

  echo "$RAW_RESP" | jq .
  KIND="$(echo "$RAW_RESP" | jq -r '.kind // .data.kind // empty')"

  if [ "$KIND" != "file" ]; then
    echo "Expected kind=file, got: $KIND"
    exit 1
  fi

  echo "✅ RawEvent retrievable via API."
else
  echo "RAW_EVENT_READ_PATH not set; cannot prove retrievability via API yet."
  echo "Set RAW_EVENT_READ_PATH (e.g. /users/me/rawEvents) or add a GET route."
fi

echo "== Done =="
