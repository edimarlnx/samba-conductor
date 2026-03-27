#!/bin/bash
# Run OAuth2 E2E tests using Playwright Docker container
#
# Prerequisites:
#   - Samba DC running: cd docker && docker compose up -d
#   - Meteor app running: cd web && meteor npm start
#
# Usage:
#   cd e2e
#   ./run-oauth2-tests.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_URL="${BASE_URL:-http://localhost:4080}"

echo "==> OAuth2 E2E Tests"
echo "  Base URL: ${BASE_URL}"
echo ""

# Check if Meteor is running
if ! curl -s --max-time 3 "${BASE_URL}" >/dev/null 2>&1; then
  echo "Error: Meteor app not running at ${BASE_URL}"
  echo "Start it with: cd web && meteor npm start"
  exit 1
fi

# Install deps if needed
cd "$SCRIPT_DIR"
if [ ! -d "node_modules/playwright" ]; then
  echo "  Installing dependencies..."
  npm install --silent 2>&1 | tail -1
fi

# Run tests in Playwright Docker container
echo "  Running tests in Docker container..."
docker run --rm \
  --network host \
  -v "$SCRIPT_DIR:/work/e2e" \
  -w /work/e2e \
  -e "BASE_URL=${BASE_URL}" \
  mcr.microsoft.com/playwright:v1.58.2-noble \
  sh -c "npm install --silent 2>/dev/null; node tests/oauth2.spec.js"
