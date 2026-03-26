#!/bin/bash
# Update documentation screenshots
#
# Usage:
#   ./update-screenshots.sh              # Capture all, update only changed
#   ./update-screenshots.sh admin        # Only admin pages
#   ./update-screenshots.sh selfservice  # Only self-service pages
#   ./update-screenshots.sh auth         # Only login pages
#   ./update-screenshots.sh dashboard    # Only screenshots matching "dashboard"
#   ./update-screenshots.sh --force      # Force update all (ignore diff)
#
# Prerequisites:
#   - Samba DC running:  cd docker && docker compose up -d
#   - Meteor running:    cd web && meteor npm start
#   - Playwright installed: cd e2e && npm install && npx playwright install chromium

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure node is available (try system, then meteor's bundled node)
if ! command -v node &>/dev/null; then
  METEOR_NODE="$HOME/.meteor/packages/meteor-tool/3.4.0/mt-os.linux.x86_64/dev_bundle/bin/node"
  if [ -f "$METEOR_NODE" ]; then
    export PATH="$(dirname "$METEOR_NODE"):$PATH"
  else
    echo "Error: node not found. Install Node.js or ensure Meteor is installed."
    exit 1
  fi
fi

# Check app is running
BASE_URL="${BASE_URL:-http://localhost:4080}"
if ! curl -s --max-time 3 "$BASE_URL" >/dev/null 2>&1; then
  echo "Error: App not reachable at $BASE_URL"
  echo "Start it first: cd web && meteor npm start"
  exit 1
fi

echo "Updating screenshots from $BASE_URL..."
echo ""

node screenshots/capture-all.js "$@"

echo ""
echo "Done. Screenshots in docs/screenshots/"
