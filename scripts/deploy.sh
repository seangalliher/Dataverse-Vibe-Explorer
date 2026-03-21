#!/usr/bin/env bash
# Deploy script: builds, pushes to Power Apps, and seeds the org URL into Dataverse.
# Usage: npm run deploy
set -euo pipefail

echo "=== Detecting org URL ==="

# Extract org URL from PAC CLI
ORG_URL=$(pac org who 2>&1 | grep "Org URL:" | sed 's/.*Org URL:[[:space:]]*//' | sed 's/[[:space:]]*$//' | sed 's/\/$//')

if [ -z "$ORG_URL" ]; then
  echo "WARNING: Could not detect org URL from 'pac org who'."
  echo "The app will require manual org URL entry on first use."
else
  echo "Org URL: $ORG_URL"
fi

echo ""
echo "=== Building ==="
# Pass org URL as env var so Vite can embed it
VITE_DATAVERSE_ORG_URL="$ORG_URL" npm run build

echo ""
echo "=== Pushing to Power Apps ==="
pac code push

echo ""
echo "=== Deploy complete ==="
if [ -n "$ORG_URL" ]; then
  echo "Org URL '$ORG_URL' has been embedded in the build."
  echo "Live record counts will work automatically for all users."
fi
