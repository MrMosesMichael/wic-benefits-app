# CLAUDE.md - WIC Benefits App

> Instructions for Claude Code. Read this on every session start.

## Quick Start

**Project**: WIC Benefits Assistant - Mobile app for WIC participants
**Stack**: React Native + Expo, TypeScript, Node.js/PostgreSQL
**Repo**: https://github.com/MrMosesMichael/wic-benefits-app

### On "resume" or session start:
1. Read `.claude/SESSION_STATE.md` for current work state
2. Read `.orchestrator-logs/STATUS.md` for orchestrator status
3. For deeper context: `.claude/MEMORY.md`

### On "save state" or session end:
1. Update `.claude/SESSION_STATE.md`
2. Commit uncommitted work to GitHub
3. Report what to do next session

## Session Checkpointing (Ralph Loop Pattern)

> Based on https://ghuntley.com/loop/ - enables seamless session handoffs

### Handoff Commands

| Command | Action |
|---------|--------|
| **"checkpoint"** | Write current progress to SESSION_STATE.md immediately |
| **"save and close"** | Full state dump + commit + what to do next session |
| **"resume"** | Read SESSION_STATE.md and continue from where we left off |

### Checkpoint Protocol

When working on multi-step tasks:

1. **After each logical step**: Update the `## Progress` section in SESSION_STATE.md
2. **On any significant decision**: Add to `## Decisions Made` section
3. **Before risky operations**: Checkpoint first so we can recover
4. **When user says "checkpoint"**: Immediately write full state

### What to Checkpoint

```markdown
## Current Task
[Specific task being worked on]

## Progress
- [x] Completed step (with brief outcome)
- [ ] Next step (IN PROGRESS) ← mark current step
- [ ] Upcoming step

## Files Modified
- `path/to/file.ts` - what changed and why

## Decisions Made
- Decision: rationale (so fresh session understands why)

## Blockers / Questions
- Any unresolved issues

## Next Action (for fresh session)
[Exactly what to do next - be specific enough that a fresh session can continue]
```

### Why This Matters

- **Token limits**: When you hit limits, say "checkpoint" before closing
- **Rate limits**: Checkpoint progress, then resume in new session
- **Fresh sessions are better**: Less accumulated context = more efficient
- **No lost work**: External state survives session boundaries

## Project Structure

```
wic_project/
├── orchestrator.sh              # Automated task runner
├── specs/wic-benefits-app/
│   ├── tasks.md                 # Master task list [x]=done [~]=progress [ ]=pending
│   ├── design.md                # Architecture & data models
│   └── specs/                   # Feature specifications
├── src/                         # Implementation code
├── .claude/                     # Memory system
│   ├── MEMORY.md               # Persistent context (decisions, milestones)
│   └── SESSION_STATE.md        # Current session state
└── .orchestrator-logs/
    ├── STATUS.md               # Quick orchestrator status
    └── *.log                   # Detailed logs
```

## Core Concepts

1. **Three-state benefits**: Available (green) → In Cart (amber) → Consumed (gray)
2. **Hybrid household view**: Unified view with participant filter chips
3. **Scan modes**: "Check Eligibility" (default) vs "Shopping Mode"
4. **Priority States**: Michigan, North Carolina, Florida, Oregon

## Key Commands

```bash
./orchestrator.sh --status              # Orchestrator status
./orchestrator.sh --daemon --phase 2    # Start daemon
ps aux | grep orchestrator              # Check if running
tail -20 .orchestrator-logs/orchestrator.log  # Recent logs
```

## Token Efficiency Rules

1. Read memory files first, not full specs
2. Be concise in responses
3. Batch tool calls in parallel
4. Start fresh sessions daily
5. Orchestrator uses haiku for simple tasks

## User Preferences

- Token efficiency over speed
- Orchestrator runs overnight independently
- Fresh sessions daily (close when limit hit)
- Orchestrator waits on rate limits
