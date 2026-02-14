# blECSd Terminal UI Library

A modern, high-performance terminal UI library using ECS architecture (bitecs). Rewrite of the blessed node library — **NOT backwards-compatible**.

## Tech Stack

TypeScript (strict), bitecs (ECS), Zod (validation), Biome (lint/format), Vitest (testing)

## Hard Requirements

### Feature Freeze (v0.5.1 Consolidation)
**No new features until all P0 and P1 consolidation issues are resolved.**
- No new widgets may be added
- No new modules (3d, media, game, audio, AI) may be added
- No new utility files may be created
- Bug fixes to existing code are allowed
- Refactoring existing code is encouraged
- Test improvements are allowed
- All PRs adding new features must be rejected until the v0.5.1 milestone is closed

### File Size Limits
- Component files: max 200 lines (defineComponent + typed getters/setters only)
- Widget files: max 300 lines per sub-file (use decomposition pattern)
- All other source files: max 500 lines

### Library-First Design
blECSd is a library, not a framework. Users must be able to use components standalone, skip the built-in update loop, and control their own world. All functions take `world` as a parameter — never own a global world. Never create implicit dependencies on the update loop.

### No Direct bitecs Imports
Only `src/core/ecs.ts`, `src/core/world.ts`, and `src/core/types.ts` may import from `'bitecs'`. All other code imports from `'blecsd'` (external) or `'../core/ecs'` (internal).

### Input Priority
Input must ALWAYS feel responsive. The INPUT phase is always first in the update loop and cannot be reordered. All pending input is processed immediately every frame — no events lost or delayed.

### Purely Functional — No OOP
**Banned:** `class`, `this`, `new` (except `Map`/`Set`/`Error`), prototype manipulation, inheritance.
**Required:** Pure functions, plain objects/arrays, composition, explicit state as parameters, immutable data transformations.

### Early Returns and Guard Clauses
Handle error/edge cases first, then the happy path. Max nesting depth 2-3 levels. Keep main logic at lowest indentation.

## Architecture

### Update Loop Phases
INPUT → EARLY_UPDATE → UPDATE → LATE_UPDATE → ANIMATION → LAYOUT → RENDER → POST_RENDER

The ANIMATION phase handles physics-based animations, spring dynamics, momentum scrolling, and time-based transitions (iOS bounce, Material Design, kinetic scrolling).

### ECS Pattern
Components are **pure data containers only**: `defineComponent()` + typed getters/setters. No business logic in components. Systems are pure functions that query entities with specific components and transform world state. All logic goes in systems, never in component files.

### Zod Validation
Use Zod at system boundaries for config, input, and data validation.

### Strict TypeScript
Explicit return types, no `any` (use `unknown` + type guards), defined interfaces, branded types for IDs, prefer `readonly`.

## Module Structure

```
src/
├── core/           # ecs.ts (bitecs wrapper), world.ts, scheduler.ts, events.ts
├── terminal/       # program.ts, tput.ts, input.ts, renderer.ts
├── components/     # position.ts, renderable.ts, velocity.ts, ...
├── systems/        # animation.ts, layout.ts, render.ts, ...
├── widgets/        # box.ts, text.ts, ... (high-level, optional)
├── schemas/        # Zod schemas: config.ts, input.ts, ...
└── index.ts        # Public API
```

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Development mode
pnpm build            # Build for production (run frequently — catches issues tests miss)
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm lint             # Run Biome linter
pnpm lint:fix         # Fix linting issues
pnpm typecheck        # TypeScript type checking
```

## Development Workflow

### Between Every Significant Change
1. Write tests for new functionality
2. `pnpm test` → `pnpm lint` → `pnpm typecheck` → `pnpm build`
3. Commit with atomic, clear messages: `<type>: <description>` (feat/fix/refactor/test/docs/chore)

### Always Use blECSd APIs
Check `src/index.ts` and relevant modules before building custom solutions. Search `src/` for existing exports before writing custom code.

### Epic Completion Workflow
Complete entire epics before moving on — no cherry-picking across epics. Only switch when blocked, and try to unblock first. Every `[needs-docs]` task must have docs completed before the task is done.

### Issue Tracking
- use the gh mcp server for all issue creation, modification and tracking. 
- On large rewrites, make sure to break down what normally would be tasks into tickets, and then assign those groups of tickets onto agents to work in parallel.
- Ensure agents double check they meet all acceptance criteria in tickets before closing, and that the code is merged to main before closing
- Ensure code quality guidelines like Zod usage, functionality acceptance criteria, and docs are built into the ticket definition
- ensure in-depth understanding of the ticket definition before and after work is complete.
- If the ticket is found to be incorrect in some way, ensure additional context is added to the comments on the ticket for historical tracking.

## Documentation Requirements

Every public API change needs: JSDoc with `@example`, API reference page in `docs/api/`, runnable code examples. Tag tickets with `[needs-docs]`. See @docs/ for full documentation guidelines.

## Claude Code Agent Teams

> **Experimental** — enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json or environment.

Agent teams coordinate multiple Claude Code instances. One session leads, others work independently with their own context windows, communicating directly.

### When to Use
Best for: parallel research/review, independent modules, competing debug hypotheses, cross-layer changes (frontend/backend/tests). Avoid for: sequential tasks, same-file edits, heavily dependent work.

### Teams vs Subagents
- **Subagents**: own context, report results back only, lower token cost. Best for focused tasks.
- **Agent teams**: own context, message each other directly, shared task list, higher token cost. Best for collaborative work requiring discussion.

### Key Commands
- Tell the lead in natural language to create teams, assign tasks, spawn teammates
- `Shift+Up/Down`: select teammates in in-process mode
- `Shift+Tab`: toggle delegate mode (lead coordinates only, no implementation)
- `Ctrl+T`: toggle task list

### Display Modes
- **In-process** (default): all teammates in main terminal. Works anywhere.
- **Split panes**: each teammate gets own pane. Requires tmux or iTerm2.

Set via `teammateMode` in settings.json (`"in-process"`, `"tmux"`, `"auto"`) or `--teammate-mode` flag.

### Task Coordination
Shared task list with pending/in-progress/completed states. Tasks can have dependencies. Lead assigns or teammates self-claim. File locking prevents race conditions.

### Plan Approval
Request plan approval before implementation: teammate works read-only until lead approves. Lead makes approval decisions autonomously — influence via prompt criteria.

### Hooks
- `TeammateIdle`: runs when teammate goes idle. Exit code 2 sends feedback and keeps them working.
- `TaskCompleted`: runs when task marked complete. Exit code 2 prevents completion with feedback.

### Important Limitations
- No session resumption for in-process teammates (`/resume` won't restore them)
- One team per session, no nested teams, lead is fixed
- All teammates inherit lead's permissions at spawn
- Always use the lead (not teammates) to clean up the team
- Split panes not supported in VS Code terminal, Windows Terminal, or Ghostty

### Best Practices for Agent Teams
- Include task-specific details in spawn prompts (teammates don't inherit lead's conversation history)
- Size tasks as self-contained units with clear deliverables
- Keep 5-6 tasks per teammate for productivity
- Break work so each teammate owns different files — avoid file conflicts
- Monitor and steer; don't let teams run unattended too long
- Start with research/review tasks before attempting parallel implementation
- **Limit to 2-3 teammates** — more will crash the terminal
- Always ensure you're in a tmux session before starting orchestration mode

## Migration Notes (from Original Blessed)

**Keep:** terminal capability detection (tput/terminfo), Unicode handling, color system, input parsing.
**Changed:** prototypal inheritance → ECS + FP, mutable state → immutable components + systems, event callbacks → typed event bus, manual tests → Vitest.
**Dropped:** browser support, backwards compatibility, widget class hierarchies.

## Key Files

| File | Purpose |
|------|---------|
| `src/core/ecs.ts` | ECS wrapper (only bitecs import point) |
| `tsconfig.json` | TypeScript config (strict mode) |
| `biome.json` | Biome linter/formatter config |
| `vitest.config.ts` | Test configuration |
| `.tasks/` | Issue tracking |