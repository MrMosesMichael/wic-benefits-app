#!/usr/bin/env bash
#
# sync-feedback.sh — Sync GitHub feedback issues → SESSION_STATE.md
#
# Fetches all open issues from the feedback repo, categorizes them,
# and writes a "Feedback Inbox" section to .claude/SESSION_STATE.md.
#
# Run at session start (step 3 in CLAUDE.md). Replaces manual triage.
#
# Usage:
#   ./scripts/sync-feedback.sh              # Normal run
#   ./scripts/sync-feedback.sh --dry-run    # Print only, don't write file

set -euo pipefail

REPO="MrMosesMichael/wic-benefits-feedback"
STATE_FILE=".claude/SESSION_STATE.md"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run|-n) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Dependency check ──────────────────────────────────────────────────────────
for cmd in gh jq; do
  command -v "$cmd" &>/dev/null || { echo "Error: '$cmd' is required but not found."; exit 1; }
done

if [ ! -f "$STATE_FILE" ] && [ "$DRY_RUN" = false ]; then
  echo "Error: $STATE_FILE not found. Run from project root."
  exit 1
fi

# ── Fetch ─────────────────────────────────────────────────────────────────────
echo "Fetching open issues from $REPO..."
ISSUES=$(gh issue list --repo "$REPO" --state open \
  --json number,title,labels,createdAt,body,comments --limit 100)

TOTAL=$(echo "$ISSUES" | jq 'length')
HP=$(echo "$ISSUES" | jq '[.[] | select(.labels | map(.name) | any(. == "priority:high"))] | length')

echo "  $TOTAL open issue(s), $HP high priority"
echo ""

# ── Helpers ───────────────────────────────────────────────────────────────────

# Extract first meaningful line from a GitHub issue body
# Skips: empty lines, ## headers, ---, **Source:, **Device Info
first_line_of() {
  local body="$1"
  printf '%s' "$body" \
    | grep -v '^[[:space:]]*$' \
    | grep -v '^##' \
    | grep -v '^---' \
    | grep -v '^\*\*Source' \
    | grep -v '^\*\*Device' \
    | grep -v '^\*\*Submitted' \
    | grep -v '^\*\*Platform' \
    | head -1 \
    | cut -c1-140 \
    || true
}

# Format a filtered subset of issues as a markdown section
build_section() {
  local heading="$1"
  local filtered="$2"
  local count
  count=$(echo "$filtered" | jq 'length')
  [ "$count" -eq 0 ] && return

  echo "### ${heading} (${count})"
  echo ""

  while IFS=$'\t' read -r num iss_title labels date comment_count summary latest_comment; do
    local url="https://github.com/${REPO}/issues/${num}"
    # Truncate title to 70 chars
    local short_title="${iss_title:0:70}"
    [[ "${#iss_title}" -gt 70 ]] && short_title="${short_title}…"
    printf '**#%s** [%s](%s)  \n' "$num" "$short_title" "$url"
    local meta="\`${labels}\` · ${date:0:10}"
    [[ "$comment_count" -gt 0 ]] && meta="${meta} · ${comment_count} comment(s)"
    printf '%s  \n' "$meta"
    if [[ -n "$summary" ]]; then
      printf '> %s\n' "$summary"
    fi
    if [[ -n "$latest_comment" && "$latest_comment" != "null" ]]; then
      printf '> **Latest comment:** %s\n' "$latest_comment"
    fi
    echo ""
  done < <(echo "$filtered" | jq -r '.[] | [
    (.number | tostring),
    .title,
    (.labels | map(.name) | join(", ")),
    .createdAt,
    (.comments | length | tostring),
    ((.body // "") | split("\n") | map(select(
      length > 0 and
      (startswith("##") | not) and
      (startswith("---") | not) and
      (startswith("**Source") | not) and
      (startswith("**Device") | not) and
      (startswith("**Submitted") | not) and
      (startswith("**Platform") | not)
    )) | .[0] // "" | .[0:140]),
    (if (.comments | length) > 0 then (.comments | last | .body | split("\n") | map(select(length > 0)) | .[0] // "" | .[0:140]) else null end)
  ] | @tsv')
}

# ── Categorize ────────────────────────────────────────────────────────────────
# Uses labels first, then falls back to title prefix patterns like [bug], [feature], etc.
# This helper checks: has label OR title matches pattern (case-insensitive)
HIGH=$(echo "$ISSUES"     | jq '[.[] | select(.labels | map(.name) | any(. == "priority:high"))]')
BUGS=$(echo "$ISSUES"     | jq '[.[] | select(
  (.labels | map(.name) | any(. == "priority:high") | not) and
  (
    (.labels | map(.name) | any(. == "bug")) or
    ((.labels | length) == 0 and (.title | test("^\\[bugs?\\]"; "i")))
  )
)]')
FEATURES=$(echo "$ISSUES" | jq '[.[] | select(
  (.labels | map(.name) | any(. == "priority:high") | not) and
  (
    (.labels | map(.name) | any(. == "enhancement" or . == "feature")) or
    ((.labels | length) == 0 and (.title | test("^\\[feature( request)?\\]"; "i")))
  )
)]')
TRANS=$(echo "$ISSUES"    | jq '[.[] | select(
  (.labels | map(.name) | any(. == "priority:high") | not) and
  (
    (.labels | map(.name) | any(. == "translation")) or
    ((.labels | length) == 0 and (.title | test("^\\[translation\\]"; "i")))
  ) and
  (
    (.labels | map(.name) | any(. == "bug") | not) and
    (.title | test("^\\[bugs?\\]"; "i") | not)
  )
)]')
# Other: doesn't match any category above
OTHER=$(echo "$ISSUES"    | jq '[.[] | select(
  (.labels | map(.name) | any(. == "priority:high") | not) and
  (
    (.labels | map(.name) | any(. == "bug")) or
    ((.labels | length) == 0 and (.title | test("^\\[bugs?\\]"; "i")))
  | not) and
  (
    (.labels | map(.name) | any(. == "enhancement" or . == "feature")) or
    ((.labels | length) == 0 and (.title | test("^\\[feature( request)?\\]"; "i")))
  | not) and
  (
    (.labels | map(.name) | any(. == "translation")) or
    ((.labels | length) == 0 and (.title | test("^\\[translation\\]"; "i")))
  | not)
)]')

# ── Build section text ────────────────────────────────────────────────────────
NOW=$(date -u '+%Y-%m-%d %H:%M UTC')

SECTION_LINES="## Feedback Inbox

> Last synced: ${NOW} · [${TOTAL} open issues](https://github.com/${REPO}/issues)
"

if [ "$(echo "$HIGH" | jq 'length')" -gt 0 ]; then
  SECTION_LINES+=$'\n'
  SECTION_LINES+=$(build_section "🚨 High Priority" "$HIGH")
fi
if [ "$(echo "$BUGS" | jq 'length')" -gt 0 ]; then
  SECTION_LINES+=$'\n'
  SECTION_LINES+=$(build_section "Bugs" "$BUGS")
fi
if [ "$(echo "$FEATURES" | jq 'length')" -gt 0 ]; then
  SECTION_LINES+=$'\n'
  SECTION_LINES+=$(build_section "Feature Requests" "$FEATURES")
fi
if [ "$(echo "$TRANS" | jq 'length')" -gt 0 ]; then
  SECTION_LINES+=$'\n'
  SECTION_LINES+=$(build_section "Translation" "$TRANS")
fi
if [ "$(echo "$OTHER" | jq 'length')" -gt 0 ]; then
  SECTION_LINES+=$'\n'
  SECTION_LINES+=$(build_section "Other" "$OTHER")
fi

if [ "$TOTAL" -eq 0 ]; then
  SECTION_LINES+=$'\n_No open issues — inbox clear._\n'
fi

# ── Print to stdout ───────────────────────────────────────────────────────────
echo "══════════════════════════════════════════════════"
echo "$SECTION_LINES"
echo "══════════════════════════════════════════════════"

if [ "$DRY_RUN" = true ]; then
  echo "(dry-run — $STATE_FILE not modified)"
  exit 0
fi

# ── Write to SESSION_STATE.md ─────────────────────────────────────────────────
# Strip any existing Feedback Inbox section (from header to end of file),
# then append the new one with a separator.
tmpfile=$(mktemp)

if grep -q '^## Feedback Inbox' "$STATE_FILE" 2>/dev/null; then
  sed '/^## Feedback Inbox/,$d' "$STATE_FILE" > "$tmpfile"
else
  cp "$STATE_FILE" "$tmpfile"
fi

# Trim trailing blank lines from the base content (awk: portable macOS + Linux)
TRIMMED=$(awk '{lines[NR]=$0} END{while(NR>0 && lines[NR]~/^[[:space:]]*$/) NR--; for(i=1;i<=NR;i++) print lines[i]}' "$tmpfile")
printf '%s\n\n---\n\n%s\n' "$TRIMMED" "$SECTION_LINES" > "$STATE_FILE"

rm -f "$tmpfile"

echo "✓ Written to $STATE_FILE"
if [ "$HP" -gt 0 ]; then
  echo ""
  echo "⚠️  $HP high-priority issue(s) need attention:"
  echo "$ISSUES" | jq -r '.[] | select(.labels | map(.name) | any(. == "priority:high")) | "  #\(.number): \(.title)"'
fi
