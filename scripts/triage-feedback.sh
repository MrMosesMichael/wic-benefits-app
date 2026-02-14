#!/usr/bin/env bash
#
# triage-feedback.sh — Fetch and summarize open GitHub feedback issues
#
# Usage: ./scripts/triage-feedback.sh [--label LABEL] [--since DAYS]
#
# Run at session start to see what users have reported.
# Requires: gh CLI authenticated with access to the feedback repo.

set -euo pipefail

REPO="MrMosesMichael/wic-benefits-feedback"
LABEL_FILTER=""
SINCE_DAYS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --label) LABEL_FILTER="--label $2"; shift 2 ;;
    --since) SINCE_DAYS="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "=== WIC Feedback Triage ==="
echo "Repo: $REPO"
echo "Date: $(date '+%Y-%m-%d %H:%M')"
echo ""

# Count by label
echo "--- Issue Counts by Label ---"
for label in bug feature translation scanner plu-codes ux "priority:high" "native-speaker-review"; do
  count=$(gh issue list --repo "$REPO" --state open --label "$label" --json number --jq 'length' 2>/dev/null || echo 0)
  printf "  %-25s %s\n" "$label" "$count"
done
echo ""

# List open issues
echo "--- Open Issues ---"
if [ -n "$LABEL_FILTER" ]; then
  gh issue list --repo "$REPO" --state open $LABEL_FILTER --json number,title,labels,createdAt --jq '.[] | "  #\(.number) [\(.labels | map(.name) | join(", "))] \(.title) (\(.createdAt | split("T")[0]))"'
else
  gh issue list --repo "$REPO" --state open --json number,title,labels,createdAt --jq '.[] | "  #\(.number) [\(.labels | map(.name) | join(", "))] \(.title) (\(.createdAt | split("T")[0]))"'
fi
echo ""

# High priority items
HIGH=$(gh issue list --repo "$REPO" --state open --label "priority:high" --json number --jq 'length' 2>/dev/null || echo 0)
if [ "$HIGH" -gt 0 ]; then
  echo "*** $HIGH HIGH PRIORITY issue(s) need attention ***"
  gh issue list --repo "$REPO" --state open --label "priority:high" --json number,title --jq '.[] | "  #\(.number): \(.title)"'
  echo ""
fi

# New issues (last N days)
if [ -n "$SINCE_DAYS" ]; then
  SINCE_DATE=$(date -v-"${SINCE_DAYS}"d '+%Y-%m-%d' 2>/dev/null || date -d "${SINCE_DAYS} days ago" '+%Y-%m-%d' 2>/dev/null || echo "")
  if [ -n "$SINCE_DATE" ]; then
    echo "--- New Issues (last ${SINCE_DAYS} days) ---"
    gh issue list --repo "$REPO" --state open --json number,title,createdAt --jq "[.[] | select(.createdAt >= \"${SINCE_DATE}\")] | .[] | \"  #\(.number): \(.title)\""
    echo ""
  fi
fi

echo "Done. Use 'gh issue view N --repo $REPO' for details."
