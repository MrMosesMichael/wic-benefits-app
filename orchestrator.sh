#!/bin/bash

# =============================================================================
# WIC Benefits App - Development Orchestrator
# =============================================================================
# Implements the "Ralph Loop" pattern (https://ghuntley.com/loop/)
#
# Key principles:
#   1. FRESH SESSIONS: Each loop iteration spawns a new Claude session
#   2. SINGLE TASK PER LOOP: One task processed through phases per iteration
#   3. CHECKPOINT-BASED RESUME: Explicit checkpoints instead of log parsing
#   4. RETRY CONTEXT: Failed retries get context about previous attempt
#
# The Ralph Loop treats software development as "programming a new computer"
# that can autonomously refine and improve code through iterative cycles.
# =============================================================================
#
# Usage: ./orchestrator.sh [OPTIONS]
#   --phase PHASE    : Specify phase number (default: auto-detect next)
#   --item ITEM      : Specify specific item ID (e.g., H1, I1.1)
#   --resume         : Resume from last interrupted state
#   --daemon         : Run continuously every INTERVAL minutes
#   --interval MIN   : Interval in minutes for daemon mode (default: 10)
#   --duration HOURS : How long to run in daemon mode (default: 6)
#   --dry-run        : Show what would be done without executing
#   --status         : Show current state and exit

set -e

# Configuration
PROJECT_DIR="/Users/moses/projects/wic_project"
ROADMAP_FILE="$PROJECT_DIR/specs/wic-benefits-app/tasks.md"
LOG_DIR="$PROJECT_DIR/.orchestrator-logs"
STATE_FILE="$LOG_DIR/orchestrator.state"
LOCK_FILE="$LOG_DIR/orchestrator.lock"
MODEL_HEAVY="sonnet"   # For implementation tasks
MODEL_LIGHT="haiku"   # For review and commit tasks (token efficient)
RATE_LIMIT_WAIT=600   # 10 minutes wait on rate limit
MAX_RETRIES=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create log directory
mkdir -p "$LOG_DIR"

# Rotate logs - keep only last N logs per agent type
rotate_logs() {
    local agent_type="$1"
    local keep_count="${2:-10}"

    local log_count=$(ls -1 "$LOG_DIR"/${agent_type}_*.log 2>/dev/null | wc -l | tr -d ' ')
    if [ "$log_count" -gt "$keep_count" ]; then
        local to_delete=$((log_count - keep_count))
        ls -1t "$LOG_DIR"/${agent_type}_*.log | tail -n "$to_delete" | xargs rm -f
        log "INFO" "Rotated $to_delete old $agent_type logs"
    fi
}

# Rotate all agent logs
rotate_all_logs() {
    rotate_logs "implementer" 10
    rotate_logs "reviewer" 10
    rotate_logs "daemon" 5
}

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}"
    echo "${timestamp} [${level}] ${message}" >> "$LOG_DIR/orchestrator.log"
}

# Save current state for resume capability
save_state() {
    local task_id="$1"
    local task_desc="$2"
    local phase="$3"  # implementer, reviewer, committer
    local line_num="$4"

    cat > "$STATE_FILE" << EOF
TASK_ID="$task_id"
TASK_DESC="$task_desc"
PHASE="$phase"
LINE_NUM="$line_num"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
EOF
    log "INFO" "State saved: task=$task_id, phase=$phase"
}

# Load saved state
load_state() {
    if [ -f "$STATE_FILE" ]; then
        source "$STATE_FILE"
        return 0
    fi
    return 1
}

# Clear state after successful completion
clear_state() {
    if [ -f "$STATE_FILE" ]; then
        mv "$STATE_FILE" "$STATE_FILE.completed.$(date +%Y%m%d_%H%M%S)"
        log "INFO" "State cleared after successful completion"
    fi
}

# =============================================================================
# CHECKPOINT SYSTEM (Ralph Loop Pattern)
# =============================================================================
# Explicit checkpoints replace fragile log parsing for phase tracking.
# Each phase completion writes a checkpoint file, making the state machine
# deterministic and resumable.
# =============================================================================

CHECKPOINT_DIR="$LOG_DIR/checkpoints"

# Initialize checkpoint directory
init_checkpoints() {
    mkdir -p "$CHECKPOINT_DIR"
}

# Write a checkpoint after phase completion
# Usage: write_checkpoint <task_id> <phase> <status>
write_checkpoint() {
    local task_id="$1"
    local phase="$2"
    local status="$3"
    local checkpoint_file="$CHECKPOINT_DIR/${task_id}.checkpoint"

    init_checkpoints

    # Append phase completion to checkpoint file
    cat >> "$checkpoint_file" << EOF
PHASE="$phase"
STATUS="$status"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
GIT_HEAD="$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
---
EOF

    log "INFO" "Checkpoint written: task=$task_id, phase=$phase, status=$status"
}

# Read the last completed phase for a task
# Returns: phase name or empty if no checkpoint
read_last_checkpoint() {
    local task_id="$1"
    local checkpoint_file="$CHECKPOINT_DIR/${task_id}.checkpoint"

    if [ -f "$checkpoint_file" ]; then
        # Get the last PHASE entry
        grep "^PHASE=" "$checkpoint_file" | tail -1 | cut -d'"' -f2
    fi
}

# Check if a specific phase is complete for a task
# Usage: is_phase_complete <task_id> <phase>
is_phase_complete() {
    local task_id="$1"
    local phase="$2"
    local checkpoint_file="$CHECKPOINT_DIR/${task_id}.checkpoint"

    if [ -f "$checkpoint_file" ]; then
        grep -q "PHASE=\"$phase\"" "$checkpoint_file"
        return $?
    fi
    return 1
}

# Get the next phase to run based on checkpoints
# Returns: next phase name or "done" if all complete
get_next_phase() {
    local task_id="$1"
    local phases=("implementer" "reviewer" "committer")

    for phase in "${phases[@]}"; do
        if ! is_phase_complete "$task_id" "$phase"; then
            echo "$phase"
            return
        fi
    done

    echo "done"
}

# Clear checkpoints for a task (after full completion)
clear_checkpoints() {
    local task_id="$1"
    local checkpoint_file="$CHECKPOINT_DIR/${task_id}.checkpoint"

    if [ -f "$checkpoint_file" ]; then
        mv "$checkpoint_file" "$checkpoint_file.completed.$(date +%Y%m%d_%H%M%S)"
        log "INFO" "Checkpoints cleared for task $task_id"
    fi
}

# Show checkpoint status for a task
show_checkpoint_status() {
    local task_id="$1"
    local checkpoint_file="$CHECKPOINT_DIR/${task_id}.checkpoint"

    if [ -f "$checkpoint_file" ]; then
        echo -e "${CYAN}Checkpoints for $task_id:${NC}"
        cat "$checkpoint_file"
    else
        echo "No checkpoints found for $task_id"
    fi
}

# Update STATUS.md for quick status checks
update_status_file() {
    local current_task="$1"
    local current_phase="$2"
    local status="$3"

    local status_file="$LOG_DIR/STATUS.md"
    local timestamp=$(date '+%Y-%m-%d %H:%M')

    # Count completed tasks in Phase 2
    local h_done=$(grep -c "^\- \[x\].*H[0-9]" "$ROADMAP_FILE" 2>/dev/null || echo "0")
    local i_done=$(grep -c "^\- \[x\].*I[0-9]" "$ROADMAP_FILE" 2>/dev/null || echo "0")
    local j_done=$(grep -c "^\- \[x\].*J[0-9]" "$ROADMAP_FILE" 2>/dev/null || echo "0")
    local k_done=$(grep -c "^\- \[x\].*K[0-9]" "$ROADMAP_FILE" 2>/dev/null || echo "0")
    local total_done=$((h_done + i_done + j_done + k_done))

    cat > "$status_file" << EOF
# Orchestrator Status

> Auto-updated: $timestamp

## Current Task

**Task**: $current_task
**Phase**: $current_phase
**Status**: $status

## Phase 2 Progress

| Group | Complete | Total |
|-------|----------|-------|
| H - Store Detection | $h_done | 6 |
| I - Inventory | $i_done | 9 |
| J - Food Bank | $j_done | 6 |
| K - Crowdsourced | $k_done | 4 |
| **Total** | **$total_done** | **25** |

## Quick Commands

\`\`\`bash
ps aux | grep orchestrator | grep -v grep  # Check if running
tail -20 .orchestrator-logs/orchestrator.log  # Recent logs
./orchestrator.sh --daemon --phase 2  # Restart daemon
\`\`\`
EOF
    log "INFO" "Updated STATUS.md"
}

# Check if another instance is running
check_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local pid=$(cat "$LOCK_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log "WARN" "Another orchestrator instance is running (PID: $pid)"
            return 1
        else
            log "INFO" "Stale lock file found, removing..."
            rm -f "$LOCK_FILE"
        fi
    fi
    echo $$ > "$LOCK_FILE"
    trap "rm -f '$LOCK_FILE'" EXIT
    return 0
}

# Check if Claude Code is installed
check_claude() {
    if ! command -v claude &> /dev/null; then
        log "ERROR" "Claude Code CLI not found. Please install it first."
        exit 1
    fi
}

# Find task currently in progress (for resume)
find_in_progress_task() {
    # Look for tasks marked with [~] 🔄
    grep -n "^\- \[~\] 🔄" "$ROADMAP_FILE" | head -1
}

# Find next unclaimed task in roadmap
find_next_task() {
    local phase_filter="${1:-}"

    if [ -n "$phase_filter" ]; then
        # Find the line number where the phase starts
        local phase_start=$(grep -n "^## Phase $phase_filter" "$ROADMAP_FILE" | cut -d: -f1)
        if [ -z "$phase_start" ]; then
            log "WARN" "Phase $phase_filter not found in roadmap"
            return
        fi

        # Find where the next phase starts (or end of file)
        local phase_end=$(grep -n "^## Phase" "$ROADMAP_FILE" | awk -F: -v start="$phase_start" '$1 > start {print $1; exit}')

        if [ -z "$phase_end" ]; then
            phase_end=$(wc -l < "$ROADMAP_FILE")
        fi

        # Find first unclaimed task within that range
        sed -n "${phase_start},${phase_end}p" "$ROADMAP_FILE" | grep -n "^\- \[ \]" | head -1 | while read line; do
            local rel_line=$(echo "$line" | cut -d: -f1)
            local abs_line=$((phase_start + rel_line - 1))
            local content=$(echo "$line" | cut -d: -f2-)
            echo "${abs_line}:${content}"
        done
    else
        # Find first unclaimed task in entire file
        grep -n "^\- \[ \]" "$ROADMAP_FILE" | head -1
    fi
}

# Mark task as in progress
mark_in_progress() {
    local task_id="$1"
    local line_num="$2"

    log "INFO" "Marking task $task_id as in progress..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "${line_num}s/\- \[ \]/- [~] 🔄/" "$ROADMAP_FILE"
    else
        sed -i "${line_num}s/\- \[ \]/- [~] 🔄/" "$ROADMAP_FILE"
    fi
}

# Mark task as complete
mark_complete() {
    local task_id="$1"

    log "INFO" "Marking task $task_id as complete..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\- \[~\] 🔄 $task_id/- [x] ✅ $task_id/" "$ROADMAP_FILE"
    else
        sed -i "s/\- \[~\] 🔄 $task_id/- [x] ✅ $task_id/" "$ROADMAP_FILE"
    fi
}

# Check if we hit rate limit or token limit
check_rate_limit() {
    local log_file="$1"
    if grep -qi "rate limit\|Rate limit\|token limit\|You've hit your limit\|overloaded\|capacity" "$log_file" 2>/dev/null; then
        return 0  # Rate limited
    fi
    return 1  # Not rate limited
}

# Build retry context for fresh session awareness (Ralph Loop pattern)
# Each retry gets a NEW session but with awareness of previous attempt
build_retry_context() {
    local log_file="$1"
    local retry_count="$2"

    if [ $retry_count -eq 0 ]; then
        echo ""
        return
    fi

    # Gather context from previous attempt for the fresh session
    local files_changed=$(git diff --name-only HEAD 2>/dev/null | head -10 | tr '\n' ', ' | sed 's/,$//')
    local staged_files=$(git diff --cached --name-only 2>/dev/null | head -10 | tr '\n' ', ' | sed 's/,$//')
    local error_hints=$(tail -50 "$log_file" 2>/dev/null | grep -i "error\|failed\|exception" | head -5 | sed 's/^/  - /')
    local last_actions=$(tail -30 "$log_file" 2>/dev/null | grep -E "^(Reading|Writing|Editing|Created|Modified)" | tail -5 | sed 's/^/  - /')

    cat << EOF

---
RALPH LOOP: FRESH SESSION RETRY (attempt $((retry_count + 1)))
This is a NEW session. Previous attempt did not complete successfully.

Previous session context:
- Files modified (unstaged): ${files_changed:-none}
- Files staged: ${staged_files:-none}

Previous errors detected:
${error_hints:-  - No specific errors captured}

Recent actions from previous attempt:
${last_actions:-  - No actions captured}

INSTRUCTIONS: Start fresh but be aware of any existing changes above.
If files were partially modified, review them before continuing.
Do NOT repeat work that was already completed successfully.
---
EOF
}

# Run Claude Code agent with retry on rate limit
# Implements Ralph Loop pattern: each retry is a FRESH SESSION with context
run_claude_agent() {
    local agent_name="$1"
    local base_prompt="$2"
    local task_id="$3"
    local task_desc="$4"
    local model="$5"  # Model to use (sonnet or haiku)
    local retry_count=0
    local prev_log_file=""

    log "INFO" "${BLUE}Starting $agent_name agent (model: $model)...${NC}"

    # Save state before running
    save_state "$task_id" "$task_desc" "$agent_name" ""

    while [ $retry_count -lt $MAX_RETRIES ]; do
        # Fresh log file for each attempt (Ralph Loop: new session each iteration)
        local log_file="$LOG_DIR/${agent_name}_$(date +%Y%m%d_%H%M%S).log"

        log "INFO" "Attempt $((retry_count + 1))/$MAX_RETRIES for $agent_name [FRESH SESSION]"

        # Build prompt with retry context if this is a retry
        local retry_context=$(build_retry_context "$prev_log_file" "$retry_count")
        local prompt="${base_prompt}${retry_context}"

        set +e  # Don't exit on error

        # Run Claude Code - each invocation is a completely fresh session
        claude --dangerously-skip-permissions \
               --model "$model" \
               --print \
               "$prompt" 2>&1 | tee "$log_file"

        exit_code=${PIPESTATUS[0]}
        set -e

        # Store log file for potential next retry's context
        prev_log_file="$log_file"

        # Check if rate limited
        if check_rate_limit "$log_file"; then
            retry_count=$((retry_count + 1))
            log "WARN" "${YELLOW}Rate limited. Waiting $RATE_LIMIT_WAIT seconds before retry ($retry_count/$MAX_RETRIES)...${NC}"
            log "INFO" "Next attempt will be a FRESH SESSION with retry context"
            sleep $RATE_LIMIT_WAIT
            continue
        fi

        # Check if successful (look for completion message)
        if [ $exit_code -eq 0 ]; then
            # Verify the agent completed its work
            if grep -q "IMPLEMENTATION COMPLETE\|REVIEW COMPLETE\|COMMIT COMPLETE" "$log_file"; then
                log "INFO" "${GREEN}$agent_name completed successfully${NC}"
                # Write checkpoint for phase completion
                write_checkpoint "$task_id" "$agent_name" "complete"
                return 0
            else
                log "WARN" "${YELLOW}$agent_name finished but completion message not found${NC}"
                # Still consider it successful if exit code is 0
                write_checkpoint "$task_id" "$agent_name" "complete_no_message"
                return 0
            fi
        else
            log "ERROR" "${RED}$agent_name failed with exit code $exit_code${NC}"
            retry_count=$((retry_count + 1))

            if [ $retry_count -lt $MAX_RETRIES ]; then
                log "INFO" "Waiting before retry... Next attempt will be a FRESH SESSION"
                sleep 60
            fi
        fi
    done

    log "ERROR" "${RED}Max retries reached for $agent_name${NC}"
    return 1
}

# Agent 1: Implement the task
run_implementer() {
    local task_id="$1"
    local task_desc="$2"

    # Derive spec folder from task ID (H=store-detection, I=inventory, etc.)
    local spec_hint=""
    case "${task_id:0:1}" in
        H) spec_hint="store-detection" ;;
        I) spec_hint="inventory" ;;
        J) spec_hint="store-finder" ;;
        K) spec_hint="inventory" ;;
        D) spec_hint="upc-scanner" ;;
        C) spec_hint="benefits" ;;
        E) spec_hint="shopping-cart" ;;
        F) spec_hint="help-faq" ;;
        G) spec_hint="internationalization" ;;
    esac

    local prompt="TASK: $task_id - $task_desc
PROJECT: WIC Benefits Assistant (React Native/TypeScript)
CONTEXT: Read .claude/MEMORY.md for architecture decisions
SPEC: specs/wic-benefits-app/specs/${spec_hint:-*}/

Implement this feature. Create files in src/.
Do NOT: write tests, commit, or update tasks.md.
Output 'IMPLEMENTATION COMPLETE' when done."

    run_claude_agent "implementer" "$prompt" "$task_id" "$task_desc" "$MODEL_HEAVY"
}

# Agent 2: Review and test
run_reviewer() {
    local task_id="$1"
    local task_desc="$2"

    local prompt="TASK: $task_id - $task_desc
Review recent changes in src/ for this task.
Fix any bugs or issues. Note tests needed (no framework yet).
Do NOT: commit or update tasks.md.
Output 'REVIEW COMPLETE' when done."

    run_claude_agent "reviewer" "$prompt" "$task_id" "$task_desc" "$MODEL_LIGHT"
}

# Agent 3: Commit (bash function - no Claude needed)
run_committer() {
    local task_id="$1"
    local task_desc="$2"

    log "INFO" "${BLUE}Running auto-commit (bash)...${NC}"

    # Mark task complete in roadmap
    mark_complete "$task_id"

    # Stage all relevant files
    git add src/ specs/ docs/ .claude/ *.md 2>/dev/null || true
    git add -A 2>/dev/null || true

    # Check if there are changes to commit
    if git diff --cached --quiet; then
        log "WARN" "No changes to commit"
        return 0
    fi

    # Create commit
    local commit_msg="Implement $task_id: $task_desc

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

    if git commit -m "$commit_msg"; then
        log "INFO" "Commit created successfully"
    else
        log "ERROR" "Commit failed"
        return 1
    fi

    # Push to GitHub
    if git push origin main; then
        log "INFO" "${GREEN}Pushed to GitHub${NC}"
    else
        log "WARN" "Push failed - will retry later"
    fi

    log "INFO" "COMMIT COMPLETE"
    return 0
}

# Process a single task through all phases
process_task() {
    local task_id="$1"
    local task_desc="$2"
    local line_num="$3"
    local start_phase="${4:-implementer}"

    local phases=("implementer" "reviewer" "committer")
    local start_index=0

    # Find starting phase index
    for i in "${!phases[@]}"; do
        if [ "${phases[$i]}" = "$start_phase" ]; then
            start_index=$i
            break
        fi
    done

    log "INFO" "Processing task $task_id starting from phase: $start_phase"

    # Run phases sequentially starting from start_phase
    for ((i=start_index; i<${#phases[@]}; i++)); do
        local phase="${phases[$i]}"

        echo ""
        log "INFO" "=========================================="
        local phase_name=$(echo "$phase" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')
        log "INFO" "PHASE $((i+1)): $phase_name"
        log "INFO" "=========================================="

        case $phase in
            implementer)
                if ! run_implementer "$task_id" "$task_desc"; then
                    log "ERROR" "Implementation failed. State saved for resume."
                    save_state "$task_id" "$task_desc" "implementer" "$line_num"
                    return 1
                fi
                ;;
            reviewer)
                if ! run_reviewer "$task_id" "$task_desc"; then
                    log "ERROR" "Review failed. State saved for resume."
                    save_state "$task_id" "$task_desc" "reviewer" "$line_num"
                    return 1
                fi
                ;;
            committer)
                if ! run_committer "$task_id" "$task_desc"; then
                    log "ERROR" "Commit failed. State saved for resume."
                    save_state "$task_id" "$task_desc" "committer" "$line_num"
                    return 1
                fi
                ;;
        esac
    done

    # All phases completed successfully
    clear_state
    clear_checkpoints "$task_id"  # Ralph Loop: clean up checkpoint files
    update_status_file "$task_id" "complete" "Done"
    log "INFO" "${GREEN}Task $task_id completed successfully through all phases!${NC}"
    return 0
}

# Show current status
show_status() {
    echo ""
    echo -e "${CYAN}=========================================="
    echo -e "Orchestrator Status (Ralph Loop Pattern)"
    echo -e "==========================================${NC}"
    echo ""

    # Check for saved state
    if [ -f "$STATE_FILE" ]; then
        echo -e "${YELLOW}Interrupted task found:${NC}"
        cat "$STATE_FILE"
        echo ""
    else
        echo -e "${GREEN}No interrupted tasks.${NC}"
    fi

    # Check for in-progress tasks in roadmap
    echo -e "${BLUE}Tasks marked as in-progress in roadmap:${NC}"
    grep "^\- \[~\] 🔄" "$ROADMAP_FILE" 2>/dev/null || echo "  None"
    echo ""

    # Show checkpoint status for in-progress tasks
    echo -e "${BLUE}Checkpoint status (Ralph Loop):${NC}"
    if [ -d "$CHECKPOINT_DIR" ] && [ "$(ls -A "$CHECKPOINT_DIR" 2>/dev/null)" ]; then
        for checkpoint_file in "$CHECKPOINT_DIR"/*.checkpoint; do
            if [ -f "$checkpoint_file" ]; then
                local task_id=$(basename "$checkpoint_file" .checkpoint)
                local last_phase=$(read_last_checkpoint "$task_id")
                local next_phase=$(get_next_phase "$task_id")
                echo "  $task_id: last completed=$last_phase, next=$next_phase"
            fi
        done
    else
        echo "  No active checkpoints"
    fi
    echo ""

    # Count remaining tasks by phase
    echo -e "${BLUE}Remaining unclaimed tasks by phase:${NC}"
    for phase in 1 2 3 4 5 6 7; do
        local count=$(find_next_task "$phase" | wc -l | tr -d ' ')
        if [ "$count" -gt 0 ] || grep -q "^## Phase $phase" "$ROADMAP_FILE" 2>/dev/null; then
            local phase_tasks=$(grep -c "^\- \[ \]" <(sed -n "/^## Phase $phase/,/^## Phase/p" "$ROADMAP_FILE") 2>/dev/null || echo "0")
            echo "  Phase $phase: $phase_tasks unclaimed tasks"
        fi
    done
    echo ""

    # Check lock
    if [ -f "$LOCK_FILE" ]; then
        local pid=$(cat "$LOCK_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}Orchestrator is currently running (PID: $pid)${NC}"
        else
            echo -e "${GREEN}No orchestrator currently running${NC}"
        fi
    else
        echo -e "${GREEN}No orchestrator currently running${NC}"
    fi
}

# Run in daemon mode
run_daemon() {
    local interval_minutes="$1"
    local duration_hours="$2"
    local phase_filter="$3"

    local interval_seconds=$((interval_minutes * 60))
    local end_time=$(($(date +%s) + duration_hours * 3600))
    local iteration=1

    log "INFO" "${CYAN}Starting daemon mode${NC}"
    log "INFO" "Interval: ${interval_minutes} minutes"
    log "INFO" "Duration: ${duration_hours} hours"
    log "INFO" "End time: $(date -r $end_time '+%Y-%m-%d %H:%M:%S')"

    # Rotate old logs at startup
    rotate_all_logs
    echo ""

    while [ $(date +%s) -lt $end_time ]; do
        log "INFO" "${CYAN}=========================================="
        log "INFO" "Daemon iteration $iteration"
        log "INFO" "==========================================${NC}"

        # Run one task cycle (don't exit on failure in daemon mode)
        local result=0
        run_single_task "$phase_filter" "false" || result=$?

        # Check if we should continue
        if [ $(date +%s) -ge $end_time ]; then
            log "INFO" "Duration limit reached. Stopping daemon."
            break
        fi

        # Handle different results
        if [ $result -eq 0 ]; then
            log "INFO" "${GREEN}Task succeeded! Immediately starting next task...${NC}"
            # No wait - proceed immediately to next task
        elif [ $result -eq 1 ]; then
            log "WARN" "${YELLOW}Task failed (likely rate limited). Waiting before retry...${NC}"
            # Wait for interval before retrying
            local remaining=$((end_time - $(date +%s)))
            local wait_time=$interval_seconds
            if [ $remaining -lt $wait_time ]; then
                wait_time=$remaining
            fi
            if [ $wait_time -gt 0 ]; then
                log "INFO" "Sleeping for $((wait_time / 60)) minutes..."
                sleep $wait_time
            fi
        elif [ $result -eq 2 ]; then
            log "INFO" "No tasks available. Waiting for next interval..."
            local remaining=$((end_time - $(date +%s)))
            local wait_time=$interval_seconds
            if [ $remaining -lt $wait_time ]; then
                wait_time=$remaining
            fi
            if [ $wait_time -gt 0 ]; then
                sleep $wait_time
            fi
        fi

        iteration=$((iteration + 1))
    done

    log "INFO" "${GREEN}Daemon completed after $iteration iterations${NC}"
}

# Run a single task (used by both single run and daemon mode)
run_single_task() {
    local phase_filter="$1"
    local check_resume="$2"

    # Check for resume state first
    if [ "$check_resume" = "true" ] && load_state; then
        log "INFO" "${YELLOW}Resuming interrupted task: $TASK_ID (phase: $PHASE)${NC}"

        # Find the line number for this task
        local line_num=$(grep -n "$TASK_ID" "$ROADMAP_FILE" | head -1 | cut -d: -f1)

        process_task "$TASK_ID" "$TASK_DESC" "$line_num" "$PHASE"
        return $?
    fi

    # Check for in-progress task in roadmap
    local in_progress=$(find_in_progress_task)
    if [ -n "$in_progress" ]; then
        local line_num=$(echo "$in_progress" | cut -d: -f1)
        local task_content=$(echo "$in_progress" | cut -d: -f2-)
        local task_id=$(echo "$task_content" | grep -oE '[A-Z][0-9]+(\.[0-9]+)?' | head -1)
        local task_desc=$(echo "$task_content" | sed -E 's/^- \[~\] 🔄 [A-Z][0-9]+(\.[0-9]+)? //')

        log "INFO" "${YELLOW}Found in-progress task: $task_id${NC}"

        # =================================================================
        # RALPH LOOP: Use checkpoint system for deterministic phase resume
        # =================================================================
        # Instead of fragile log parsing, we use explicit checkpoints.
        # Each phase writes a checkpoint on completion, so we know exactly
        # where to resume from.
        # =================================================================

        local resume_phase=$(get_next_phase "$task_id")

        if [ "$resume_phase" = "done" ]; then
            log "INFO" "All phases complete for $task_id, marking as done"
            mark_complete "$task_id"
            clear_checkpoints "$task_id"
            clear_state
            return 0
        fi

        # Fallback: if no checkpoints exist, check logs (backwards compatibility)
        if [ -z "$resume_phase" ] || [ "$resume_phase" = "implementer" ]; then
            # Check if implementer completed but checkpoint wasn't written (legacy)
            for log_file in $(ls -t "$LOG_DIR"/implementer_*.log 2>/dev/null | head -3); do
                if grep -q "TASK: $task_id" "$log_file" && grep -q "IMPLEMENTATION COMPLETE" "$log_file"; then
                    log "INFO" "Found legacy implementer completion, writing checkpoint"
                    write_checkpoint "$task_id" "implementer" "complete_legacy"
                    resume_phase="reviewer"
                    break
                fi
            done
        fi

        log "INFO" "Resuming from phase: $resume_phase (checkpoint-based)"
        process_task "$task_id" "$task_desc" "$line_num" "$resume_phase"
        return $?
    fi

    # Find next unclaimed task
    local task_line=$(find_next_task "$phase_filter")

    if [ -z "$task_line" ]; then
        log "INFO" "${GREEN}No unclaimed tasks found in Phase ${phase_filter:-all}. All done!${NC}"
        return 2  # Special return code for "no tasks"
    fi

    # Parse task info
    local line_num=$(echo "$task_line" | cut -d: -f1)
    local task_content=$(echo "$task_line" | cut -d: -f2-)
    local task_id=$(echo "$task_content" | grep -oE '[A-Z][0-9]+(\.[0-9]+)?' | head -1)
    local task_desc=$(echo "$task_content" | sed -E 's/^- \[ \] [A-Z][0-9]+(\.[0-9]+)? //')

    log "INFO" "Selected task: ${BLUE}$task_id${NC}"
    log "INFO" "Description: $task_desc"
    log "INFO" "Line number: $line_num"

    # Mark task as in progress
    mark_in_progress "$task_id" "$line_num"
    update_status_file "$task_id - $task_desc" "implementer" "Starting"

    # Process the task
    process_task "$task_id" "$task_desc" "$line_num" "implementer"
    return $?
}

# Main orchestration flow
main() {
    local phase=""
    local item=""
    local dry_run=false
    local resume=false
    local daemon=false
    local interval=10
    local duration=6
    local show_status_only=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --phase)
                phase="$2"
                shift 2
                ;;
            --item)
                item="$2"
                shift 2
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --resume)
                resume=true
                shift
                ;;
            --daemon)
                daemon=true
                shift
                ;;
            --interval)
                interval="$2"
                shift 2
                ;;
            --duration)
                duration="$2"
                shift 2
                ;;
            --status)
                show_status_only=true
                shift
                ;;
            *)
                log "ERROR" "Unknown argument: $1"
                echo "Usage: $0 [--phase PHASE] [--item ITEM] [--resume] [--daemon] [--interval MIN] [--duration HOURS] [--status] [--dry-run]"
                exit 1
                ;;
        esac
    done

    log "INFO" "=========================================="
    log "INFO" "WIC Benefits App - Development Orchestrator"
    log "INFO" "=========================================="

    # Show status only
    if [ "$show_status_only" = true ]; then
        show_status
        exit 0
    fi

    check_claude

    # Check for lock (prevent multiple instances)
    if ! check_lock; then
        exit 1
    fi

    cd "$PROJECT_DIR"

    # Dry run mode
    if [ "$dry_run" = true ]; then
        local task_line=$(find_next_task "$phase")
        if [ -n "$task_line" ]; then
            local task_id=$(echo "$task_line" | cut -d: -f2- | grep -oE '[A-Z][0-9]+(\.[0-9]+)?' | head -1)
            log "INFO" "${YELLOW}Dry run - would process task $task_id${NC}"
        else
            log "INFO" "${GREEN}Dry run - no unclaimed tasks found${NC}"
        fi
        exit 0
    fi

    # Daemon mode
    if [ "$daemon" = true ]; then
        run_daemon "$interval" "$duration" "$phase"
        exit 0
    fi

    # Single run mode
    run_single_task "$phase" "$resume"
    exit $?
}

# Handle interrupts gracefully
trap 'log "WARN" "Interrupted. State saved for resume."; exit 130' INT TERM

# Run main function
main "$@"
