#!/bin/bash
# Run E2E tests using Playwright Docker container
#
# Usage:
#   ./run-tests.sh                    # Run all tests (requires Meteor + Samba running on host)
#   ./run-tests.sh --all              # Same as above
#   ./run-tests.sh auth               # Run only auth suite
#   ./run-tests.sh users              # Run only users suite
#   ./run-tests.sh --compose          # Full stack via Docker Compose (no host dependencies)
#   ./run-tests.sh --compose users    # Docker Compose + filter by suite

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FILTER=""
USE_COMPOSE=false

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --compose) USE_COMPOSE=true ;;
    *) FILTER="$arg" ;;
  esac
done
FILTER="${FILTER:---all}"

echo "==> Samba Conductor E2E Tests"
echo "  Filter: ${FILTER}"

# ─── Docker Compose mode ───────────────────────────────────────────
if [ "$USE_COMPOSE" = true ]; then
  echo "  Mode: Docker Compose (full stack)"
  echo ""

  # Clean previous results
  rm -rf "$SCRIPT_DIR/results"
  mkdir -p "$SCRIPT_DIR/results/screenshots"

  cd "$SCRIPT_DIR"

  # Export filter for the tests container
  export FILTER

  echo "  Starting Samba DC + Meteor + Playwright..."
  echo "  (this may take a few minutes on first run)"
  echo "  ========================================="
  echo ""

  docker compose up --build --exit-code-from tests 2>&1
  EXIT_CODE=$?

  # Cleanup containers
  docker compose down 2>/dev/null

  echo ""
  echo "  ========================================="
  if [ -f "$SCRIPT_DIR/results/report.html" ]; then
    echo "  Report: e2e/results/report.html"
    echo "  Screenshots: e2e/results/screenshots/"
  fi

  exit $EXIT_CODE
fi

# ─── Host mode (Meteor + Samba running on host) ───────────────────
BASE_URL="${BASE_URL:-http://localhost:4080}"
echo "  Mode: Host (Playwright Docker only)"
echo "  Base URL: ${BASE_URL}"
echo ""

# Clean previous results
rm -rf "$SCRIPT_DIR/results"
mkdir -p "$SCRIPT_DIR/results/screenshots"

# Check if Meteor is running
echo "  Checking Meteor app..."
MAX_RETRIES=3
RETRY=0
while ! curl -s --max-time 5 "${BASE_URL}" >/dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    echo "  ERROR: Meteor app not running at ${BASE_URL}"
    echo "  Start it with: cd web && meteor npm start"
    echo "  Or use: ./run-tests.sh --compose"
    exit 1
  fi
  echo "  Waiting for Meteor app... (attempt $RETRY/$MAX_RETRIES)"
  sleep 5
done
echo "  Meteor app is running."

# Install deps if needed
cd "$SCRIPT_DIR"
if [ ! -d "node_modules/playwright" ]; then
  echo "  Installing dependencies..."
  npm install --silent 2>&1 | tail -1
fi

# Run tests in Playwright Docker container
echo ""
echo "  Running tests in Docker container..."
echo "  ========================================="
echo ""

docker run --rm \
  --network host \
  -v "$SCRIPT_DIR:/work/e2e" \
  -w /work/e2e \
  -e "BASE_URL=${BASE_URL}" \
  -e "FILTER=${FILTER}" \
  mcr.microsoft.com/playwright:v1.58.2-noble \
  sh -c "npm install --silent 2>/dev/null; node tests/run-all.js"

EXIT_CODE=$?

echo ""
echo "  ========================================="
if [ -f "$SCRIPT_DIR/results/report.html" ]; then
  echo "  Report: e2e/results/report.html"
  echo "  Screenshots: e2e/results/screenshots/"
fi

exit $EXIT_CODE
