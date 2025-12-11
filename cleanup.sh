#!/usr/bin/env bash

set -e

echo "=== OLIV1 CLEANUP: Removing legacy code & build artifacts ==="

archive_or_delete () {
  local path="$1"
  if [ -d "$path" ] || [ -f "$path" ]; then
      echo "Deleting $path"
      git rm -rf "$path" 2>/dev/null || rm -rf "$path"
  fi
}

echo "⚙️  Removing build dist folders..."
archive_or_delete "services/api/dist"
archive_or_delete "backend/api/dist"
archive_or_delete "cloudrun/dist"

echo "⚙️  Removing entire deprecated backends..."
archive_or_delete "backend"
archive_or_delete "cloudrun"

echo "⚙️  Removing empty/unused functions folder..."
archive_or_delete "functions"

echo "⚙️  Removing unused root-level lib files..."
archive_or_delete "lib/auth/AuthContext.tsx"
archive_or_delete "lib/firebaseConfig.ts"

echo "⚙️  Removing root-level Expo app configs..."
archive_or_delete "app.json"
archive_or_delete "expo-env.d.ts"

echo "⚙️  Removing debug logs..."
find . -name "firebase-debug.log" -type f -exec git rm -f {} \; 2>/dev/null || true
find . -name "firestore-debug.log" -type f -exec git rm -f {} \; 2>/dev/null || true
archive_or_delete "cloudrun/healthos-api-dev-0.json"
archive_or_delete "cloudrun/healthos-api-dev-1.json"

echo "⚙️  Removing any accidentally committed .expo cache..."
find . -path "*/.expo/*" -type f -exec git rm -f {} \; 2>/dev/null || true

echo "=== CLEANUP COMPLETE ==="
echo "Run: git commit -m 'Cleanup: removed legacy code and dist artifacts'"

