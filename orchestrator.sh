#!/bin/bash

# WIC Benefits App - Development Orchestrator
# Launches Claude Code agents in sequence to work on roadmap items
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

# Run Claude Code agent with retry on rate limit
run_claude_agent() {
    local agent_name="$1"
    local prompt="$2"
    local task_id="$3"
    local task_desc="$4"
    local model="$5"  # Model to use (sonnet or haiku)
    local log_file="$LOG_DIR/${agent_name}_$(date +%Y%m%d_%H%M%S).log"
    local retry_count=0

    log "INFO" "${BLUE}Starting $agent_name agent (model: $model)...${NC}"

    # Save state before running
    save_state "$task_id" "$task_desc" "$agent_name" ""

    while [ $retry_count -lt $MAX_RETRIES ]; do
        log "INFO" "Attempt $((retry_count + 1))/$MAX_RETRIES for $agent_name"

        set +e  # Don't exit on error

        # Run Claude Code (no timeout on macOS - relies on rate limit handling)
        claude --dangerously-skip-permissions \
               --model "$model" \
               --print \
               "$prompt" 2>&1 | tee "$log_file"

        exit_code=${PIPESTATUS[0]}
        set -e

        # Check if rate limited
        if check_rate_limit "$log_file"; then
            retry_count=$((retry_count + 1))
            log "WARN" "${YELLOW}Rate limited. Waiting $RATE_LIMIT_WAIT seconds before retry ($retry_count/$MAX_RETRIES)...${NC}"
            sleep $RATE_LIMIT_WAIT
            continue
        fi

        # Check if successful (look for completion message)
        if [ $exit_code -eq 0 ]; then
            # Verify the agent completed its work
            if grep -q "IMPLEMENTATION COMPLETE\|REVIEW COMPLETE\|COMMIT COMPLETE" "$log_file"; then
                log "INFO" "${GREEN}$agent_name completed successfully${NC}"
                return 0
            else
                log "WARN" "${YELLOW}$agent_name finished but completion message not found${NC}"
                # Still consider it successful if exit code is 0
                return 0
            fi
        else
            log "ERROR" "${RED}$agent_name failed with exit code $exit_code${NC}"
            retry_count=$((retry_count + 1))

            if [ $retry_count -lt $MAX_RETRIES ]; then
                log "INFO" "Waiting before retry..."
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

    local prompt="You are implementing a feature for the WIC Benefits Assistant app.

TASK: $task_id - $task_desc

Instructions:
1. Read the roadmap at specs/wic-benefits-app/tasks.md to understand context
2. Read the relevant spec files in specs/wic-benefits-app/specs/
3. Read the design.md for data models and architecture
4. Implement the feature according to the specifications
5. Create necessary files, components, and logic
6. Do NOT write tests (that's the next agent's job)
7. Do NOT commit (that's done by another agent)
8. Do NOT mark the task as complete in tasks.md

Focus on clean, working code that matches the specifications.
When you are done implementing, output 'IMPLEMENTATION COMPLETE' as your final message."

    run_claude_agent "implementer" "$prompt" "$task_id" "$task_desc" "$MODEL_HEAVY"
}

# Agent 2: Review and test
run_reviewer() {
    local task_id="$1"
    local task_desc="$2"

    local prompt="You are reviewing and testing code for the WIC Benefits Assistant app.

TASK IMPLEMENTED: $task_id - $task_desc

Instructions:
1. Review the recently created/modified files in src/ for this task
2. Check for bugs, issues, or deviations from the spec
3. Fix any issues you find
4. Write appropriate tests if a testing framework is set up
5. If no testing framework exists, document what tests should be written
6. Do NOT commit (that's done by another agent)
7. Do NOT mark the task as complete in tasks.md

Focus on code quality, correctness, and identifying any issues.
When you are done reviewing, output 'REVIEW COMPLETE' as your final message."

    run_claude_agent "reviewer" "$prompt" "$task_id" "$task_desc" "$MODEL_LIGHT"
}

# Agent 3: Commit and document
run_committer() {
    local task_id="$1"
    local task_desc="$2"

    local prompt="You are committing completed work for the WIC Benefits Assistant app.

TASK COMPLETED: $task_id - $task_desc

Instructions:
1. Review what was implemented by checking git status and recent file changes
2. Update the roadmap (specs/wic-benefits-app/tasks.md):
   - Change the task from [~] 🔄 to [x] ✅ for task $task_id
3. Stage all relevant files with git add (src/, specs/, any new files)
4. Create a descriptive commit message that:
   - Summarizes what was implemented
   - References the task ID ($task_id)
   - Includes 'Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>'
5. Push to GitHub

When you are done, output 'COMMIT COMPLETE' as your final message."

    run_claude_agent "committer" "$prompt" "$task_id" "$task_desc" "$MODEL_LIGHT"
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
    update_status_file "$task_id" "complete" "Done"
    log "INFO" "${GREEN}Task $task_id completed successfully through all phases!${NC}"
    return 0
}

# Show current status
show_status() {
    echo ""
    echo -e "${CYAN}=========================================="
    echo -e "Orchestrator Status"
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
        if [ $result -eq 1 ]; then
            log "WARN" "${YELLOW}Task failed (likely rate limited). Will retry next iteration.${NC}"
        elif [ $result -eq 2 ]; then
            log "INFO" "No tasks available. Waiting for next interval..."
        fi

        # Wait for next interval
        local remaining=$((end_time - $(date +%s)))
        local wait_time=$interval_seconds
        if [ $remaining -lt $wait_time ]; then
            wait_time=$remaining
        fi

        if [ $wait_time -gt 0 ]; then
            log "INFO" "Sleeping for $((wait_time / 60)) minutes until next iteration..."
            sleep $wait_time
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

        # Determine which phase to resume from
        # Check logs that mention this specific task
        local resume_phase="implementer"

        # Look for implementer log with this task that completed
        for log_file in $(ls -t "$LOG_DIR"/implementer_*.log 2>/dev/null); do
            if grep -q "TASK: $task_id" "$log_file" && grep -q "IMPLEMENTATION COMPLETE" "$log_file"; then
                resume_phase="reviewer"
                break
            fi
        done

        # If implementer done, check for reviewer
        if [ "$resume_phase" = "reviewer" ]; then
            for log_file in $(ls -t "$LOG_DIR"/reviewer_*.log 2>/dev/null); do
                if grep -q "TASK IMPLEMENTED: $task_id" "$log_file" && grep -q "REVIEW COMPLETE" "$log_file"; then
                    resume_phase="committer"
                    break
                fi
            done
        fi

        log "INFO" "Resuming from phase: $resume_phase"
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
