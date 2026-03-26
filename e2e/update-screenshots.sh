#!/bin/bash
# Update documentation screenshots
#
# This script handles the full lifecycle:
#   1. Starts Samba DC + replica (docker compose)
#   2. Starts Meteor app
#   3. Installs Playwright dependencies if needed
#   4. Captures screenshots (only updates changed files)
#   5. Stops Meteor app
#
# Usage:
#   ./update-screenshots.sh              # Capture all, update only changed
#   ./update-screenshots.sh admin        # Only admin pages
#   ./update-screenshots.sh selfservice  # Only self-service pages
#   ./update-screenshots.sh auth         # Only login pages
#   ./update-screenshots.sh dashboard    # Only screenshots matching "dashboard"
#   ./update-screenshots.sh --force      # Force update all (ignore diff)
#   ./update-screenshots.sh --no-cleanup # Don't stop services after capture

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:4080}"
METEOR_PID=""
NO_CLEANUP=false

# Parse --no-cleanup flag
CAPTURE_ARGS=()
for arg in "$@"; do
  if [ "$arg" = "--no-cleanup" ]; then
    NO_CLEANUP=true
  else
    CAPTURE_ARGS+=("$arg")
  fi
done

function cleanup() {
  if [ "$NO_CLEANUP" = true ]; then
    echo ""
    echo "Services left running (--no-cleanup)."
    return
  fi

  echo ""
  echo "Cleaning up..."

  # Stop Meteor
  if [ -n "$METEOR_PID" ] && kill -0 "$METEOR_PID" 2>/dev/null; then
    echo "  Stopping Meteor (PID $METEOR_PID)..."
    kill "$METEOR_PID" 2>/dev/null || true
    wait "$METEOR_PID" 2>/dev/null || true
  fi

  echo "  Done. Docker services left running."
}

trap cleanup EXIT

# --- Step 1: Ensure node is available ---
echo "==> Checking Node.js..."
if ! command -v node &>/dev/null; then
  # Try nvm
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  if ! command -v node &>/dev/null; then
    # Fallback to Meteor's bundled node
    METEOR_NODE=$(find "$HOME/.meteor/packages/meteor-tool" -name node -path "*/bin/node" 2>/dev/null | head -1)
    if [ -n "$METEOR_NODE" ]; then
      export PATH="$(dirname "$METEOR_NODE"):$PATH"
    else
      echo "Error: node not found. Install Node.js (nvm) or Meteor."
      exit 1
    fi
  fi
fi
echo "  Node $(node --version)"

# --- Step 2: Start Samba DC + replica ---
echo ""
echo "==> Starting Samba DC + replica..."
cd "$PROJECT_DIR/docker"

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'samba-ad-dc'; then
  echo "  Samba DC already running."
else
  docker compose --profile replica up -d --build 2>&1 | tail -5
  echo "  Waiting for Samba provisioning..."
  # Wait for samba to be ready (check LDAP port)
  for i in $(seq 1 60); do
    if docker exec samba-ad-dc samba-tool domain info 127.0.0.1 &>/dev/null; then
      break
    fi
    sleep 2
  done
  echo "  Samba DC ready."
fi

# --- Step 3: Start Meteor app ---
echo ""
echo "==> Starting Meteor app..."
cd "$PROJECT_DIR/web"

if curl -s --max-time 3 "$BASE_URL" >/dev/null 2>&1; then
  echo "  Meteor already running at $BASE_URL."
else
  meteor npm install --silent 2>&1 | tail -1
  meteor npm start > /tmp/meteor-screenshots.log 2>&1 &
  METEOR_PID=$!
  echo "  Meteor starting (PID $METEOR_PID)..."

  # Wait for Meteor to be ready
  for i in $(seq 1 120); do
    if curl -s --max-time 2 "$BASE_URL" >/dev/null 2>&1; then
      break
    fi
    if ! kill -0 "$METEOR_PID" 2>/dev/null; then
      echo "  Error: Meteor exited unexpectedly. Check /tmp/meteor-screenshots.log"
      exit 1
    fi
    sleep 2
  done

  if ! curl -s --max-time 3 "$BASE_URL" >/dev/null 2>&1; then
    echo "  Error: Meteor failed to start within 4 minutes."
    exit 1
  fi
  echo "  Meteor ready at $BASE_URL."
fi

# --- Step 4 & 5: Run Playwright via Docker container ---
echo ""
echo "==> Capturing screenshots via Playwright container..."
echo ""
cd "$SCRIPT_DIR"

# Install npm deps locally (for the capture script's require('playwright'))
if [ ! -d "node_modules/playwright" ]; then
  echo "  Installing dependencies..."
  npm install --silent 2>&1 | tail -1
fi

# Detect if running natively or needs container
if npx playwright install --dry-run chromium &>/dev/null 2>&1 && [ -d "$HOME/.cache/ms-playwright" ]; then
  echo "  Using local Playwright."
  node screenshots/capture-all.js "${CAPTURE_ARGS[@]}"
else
  echo "  Using Playwright Docker container (Fedora/unsupported OS detected)."

  # Run capture script inside the official Playwright container
  # --network host: access localhost:4080 (Meteor) and localhost:636 (Samba)
  # Mount e2e/ for scripts and docs/screenshots/ for output
  docker run --rm \
    --network host \
    -v "$SCRIPT_DIR:/work/e2e" \
    -v "$PROJECT_DIR/docs/screenshots:/work/docs/screenshots" \
    -w /work/e2e \
    -e "BASE_URL=${BASE_URL}" \
    -e "SCREENSHOT_DIR=/work/docs/screenshots" \
    mcr.microsoft.com/playwright:v1.52.0-noble \
    sh -c "npm install --silent 2>/dev/null; node screenshots/capture-all.js ${CAPTURE_ARGS[*]}"
fi

echo ""
echo "Done. Screenshots in docs/screenshots/"
