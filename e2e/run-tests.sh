#!/usr/bin/env bash
#
# run-tests.sh — Run Maestro E2E tests against the iOS Simulator
#
# Prerequisites:
#   - Maestro installed (~/.maestro/bin/maestro)
#   - iOS Simulator booted with the app installed
#   - Expo dev server running (npx expo start)
#
# Usage:
#   ./e2e/run-tests.sh                  # Run all flows
#   ./e2e/run-tests.sh flows/01_*.yaml  # Run specific flow
#

set -euo pipefail

export PATH="$PATH:$HOME/.maestro/bin"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCREENSHOT_DIR="$SCRIPT_DIR/screenshots"

mkdir -p "$SCREENSHOT_DIR"

if [ $# -gt 0 ]; then
  # Run specific flow(s)
  for flow in "$@"; do
    echo "Running: $flow"
    maestro test "$SCRIPT_DIR/$flow"
  done
else
  # Run all flows in order
  for flow in "$SCRIPT_DIR"/flows/*.yaml; do
    echo ""
    echo "════════════════════════════════════════"
    echo "Running: $(basename "$flow")"
    echo "════════════════════════════════════════"
    maestro test "$flow" || echo "⚠️  $(basename "$flow") failed"
  done
fi

echo ""
echo "Screenshots saved to: $SCREENSHOT_DIR/"
ls -1 "$SCREENSHOT_DIR"/*.png 2>/dev/null | wc -l | xargs -I{} echo "{} screenshot(s) captured"
