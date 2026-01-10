#!/bin/bash

# WIC Benefits App - Development Orchestrator
# Launches Claude Code agents in sequence to work on roadmap items
#
# Usage: ./orchestrator.sh [--phase PHASE] [--item ITEM]
#   --phase: Specify phase number (default: auto-detect next)
#   --item: Specify specific item ID (e.g., H1, I1.1)
#   --dry-run: Show what would be done without executing

set -e

# Configuration
PROJECT_DIR="/Users/moses/projects/wic_project"
ROADMAP_FILE="$PROJECT_DIR/specs/wic-benefits-app/tasks.md"
LOG_DIR="$PROJECT_DIR/.orchestrator-logs"
MODEL="sonnet"
RATE_LIMIT_WAIT=300  # 5 minutes wait on rate limit

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if Claude Code is installed
check_claude() {
    if ! command -v claude &> /dev/null; then
        log "ERROR" "Claude Code CLI not found. Please install it first."
        exit 1
    fi
}

# Find next unclaimed task in roadmap
find_next_task() {
    local phase_filter="${1:-}"

    # Look for unclaimed tasks (marked with - [ ])
    # Skip completed tasks (marked with - [x])
    # Skip tasks marked as in_progress (marked with - [~] or has 🔄)

    if [ -n "$phase_filter" ]; then
        # Find the line number where the phase starts
        local phase_start=$(grep -n "^## Phase $phase_filter" "$ROADMAP_FILE" | cut -d: -f1)
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

# Get task details from roadmap
get_task_info() {
    local task_id="$1"

    # Extract the task line and context
    grep -B 5 -A 2 "$task_id" "$ROADMAP_FILE" | head -10
}

# Mark task as in progress
mark_in_progress() {
    local task_id="$1"
    local line_num="$2"

    log "INFO" "Marking task $task_id as in progress..."

    # Use sed to change [ ] to [~] for the specific task
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

    # Find the line with this task and mark it complete
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\- \[~\] 🔄 $task_id/- [x] ✅ $task_id/" "$ROADMAP_FILE"
    else
        sed -i "s/\- \[~\] 🔄 $task_id/- [x] ✅ $task_id/" "$ROADMAP_FILE"
    fi
}

# Run Claude Code agent with retry on rate limit
run_claude_agent() {
    local agent_name="$1"
    local prompt="$2"
    local log_file="$LOG_DIR/${agent_name}_$(date +%Y%m%d_%H%M%S).log"
    local max_retries=5
    local retry_count=0

    log "INFO" "${BLUE}Starting $agent_name agent...${NC}"
    echo -e "${YELLOW}Prompt:${NC} $prompt"
    echo ""

    while [ $retry_count -lt $max_retries ]; do
        # Run Claude Code with the prompt
        set +e  # Don't exit on error

        claude --dangerously-skip-permissions \
               --model "$MODEL" \
               --print \
               "$prompt" 2>&1 | tee "$log_file"

        exit_code=${PIPESTATUS[0]}
        set -e

        # Check if rate limited
        if grep -q "rate limit\|Rate limit\|token limit\|You've hit your limit" "$log_file"; then
            retry_count=$((retry_count + 1))
            log "WARN" "${YELLOW}Rate limited. Waiting $RATE_LIMIT_WAIT seconds before retry ($retry_count/$max_retries)...${NC}"
            sleep $RATE_LIMIT_WAIT
            continue
        fi

        # Check if successful
        if [ $exit_code -eq 0 ]; then
            log "INFO" "${GREEN}$agent_name completed successfully${NC}"
            return 0
        else
            log "ERROR" "${RED}$agent_name failed with exit code $exit_code${NC}"
            return $exit_code
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

Focus on clean, working code that matches the specifications.
When you are done implementing, output 'IMPLEMENTATION COMPLETE' as your final message."

    run_claude_agent "implementer" "$prompt"
}

# Agent 2: Review and test
run_reviewer() {
    local task_id="$1"
    local task_desc="$2"

    local prompt="You are reviewing and testing code for the WIC Benefits Assistant app.

TASK IMPLEMENTED: $task_id - $task_desc

Instructions:
1. Review the recently created/modified files for this task
2. Check for bugs, issues, or deviations from the spec
3. Fix any issues you find
4. Write appropriate tests (unit tests, integration tests as needed)
5. Run the tests to make sure they pass
6. Do NOT commit (that's done by another agent)

Focus on code quality, correctness, and test coverage.
When you are done reviewing and testing, output 'REVIEW COMPLETE' as your final message."

    run_claude_agent "reviewer" "$prompt"
}

# Agent 3: Commit and document
run_committer() {
    local task_id="$1"
    local task_desc="$2"

    local prompt="You are committing completed work for the WIC Benefits Assistant app.

TASK COMPLETED: $task_id - $task_desc

Instructions:
1. Review what was implemented and tested
2. Update the roadmap (specs/wic-benefits-app/tasks.md):
   - Change the task from [~] 🔄 to [x] ✅
3. Update any relevant documentation if needed
4. Stage all relevant files with git add
5. Create a descriptive commit message that:
   - Summarizes what was implemented
   - References the task ID
   - Includes 'Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>'
6. Push to GitHub

When you are done, output 'COMMIT COMPLETE' as your final message."

    run_claude_agent "committer" "$prompt"
}

# Main orchestration flow
main() {
    local phase=""
    local item=""
    local dry_run=false

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
            *)
                log "ERROR" "Unknown argument: $1"
                exit 1
                ;;
        esac
    done

    log "INFO" "=========================================="
    log "INFO" "WIC Benefits App - Development Orchestrator"
    log "INFO" "=========================================="

    check_claude
    cd "$PROJECT_DIR"

    # Find the next task to work on
    if [ -n "$item" ]; then
        # Specific item provided
        task_line=$(grep -n "^\- \[ \] $item" "$ROADMAP_FILE" | head -1)
    else
        # Find next unclaimed task
        task_line=$(find_next_task "$phase")
    fi

    if [ -z "$task_line" ]; then
        log "INFO" "${GREEN}No unclaimed tasks found. All done!${NC}"
        exit 0
    fi

    # Parse task info
    line_num=$(echo "$task_line" | cut -d: -f1)
    task_content=$(echo "$task_line" | cut -d: -f2-)
    task_id=$(echo "$task_content" | grep -oE '[A-Z][0-9]+(\.[0-9]+)?' | head -1)
    # Remove the "- [ ] ID " prefix to get just the description
    task_desc=$(echo "$task_content" | sed -E 's/^- \[ \] [A-Z][0-9]+(\.[0-9]+)? //')

    log "INFO" "Selected task: ${BLUE}$task_id${NC}"
    log "INFO" "Description: $task_desc"
    log "INFO" "Line number: $line_num"

    if [ "$dry_run" = true ]; then
        log "INFO" "${YELLOW}Dry run - would process task $task_id${NC}"
        exit 0
    fi

    # Mark task as in progress
    mark_in_progress "$task_id" "$line_num"

    echo ""
    log "INFO" "=========================================="
    log "INFO" "PHASE 1: Implementation"
    log "INFO" "=========================================="

    if ! run_implementer "$task_id" "$task_desc"; then
        log "ERROR" "Implementation failed. Task remains in progress."
        exit 1
    fi

    echo ""
    log "INFO" "=========================================="
    log "INFO" "PHASE 2: Review & Testing"
    log "INFO" "=========================================="

    if ! run_reviewer "$task_id" "$task_desc"; then
        log "ERROR" "Review failed. Task remains in progress."
        exit 1
    fi

    echo ""
    log "INFO" "=========================================="
    log "INFO" "PHASE 3: Commit & Documentation"
    log "INFO" "=========================================="

    if ! run_committer "$task_id" "$task_desc"; then
        log "ERROR" "Commit failed. Task remains in progress."
        exit 1
    fi

    echo ""
    log "INFO" "=========================================="
    log "INFO" "${GREEN}Task $task_id completed successfully!${NC}"
    log "INFO" "=========================================="
}

# Run main function
main "$@"
