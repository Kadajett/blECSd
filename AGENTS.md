# Agent Instructions for blECSd

This document contains instructions for AI coding agents (Codex, Claude, etc.) working on the blECSd terminal UI library.

**For full project documentation, see CLAUDE.md.** This file contains the essential rules that MUST be followed.

---

## Issue Tracking with Beads

This project uses **bd** (beads) for issue tracking. The `bd` command is available at `/home/kadajett/.local/bin/bd`.

### Quick Reference

```bash
bd ready              # Find available work (no blockers)
bd list --status=open # All open issues
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd blocked            # Show blocked issues
bd stats              # Project statistics
bd sync               # Sync with git remote
```

### Epic Completion Workflow (HARD REQUIREMENT)

**Complete entire epics before moving on.** Do not cherry-pick individual tasks across multiple epics.

**Rules:**

1. **Focus on one epic at a time** - Work on the highest priority epic until ALL of its tasks are complete (including P1, P2 tasks within that epic)
2. **Only switch when blocked** - If all remaining tasks in the current epic are blocked:
   - First, try to unblock them by completing the blocking work
   - If blockers are in a different epic, complete that epic first
   - Return to finish the original epic once unblocked
3. **Document as you go** - Every task with `[needs-docs]` must have documentation completed before the task is considered done
4. **Close the epic** - An epic is only complete when ALL child tasks are closed and documented

**Workflow:**

```bash
# Check current epic status
bd list --status=open | grep "blessed-<epic-id>"

# If blocked, check what's blocking
bd blocked | grep "blessed-<epic-id>"

# Work on unblocking dependencies first
bd show <blocking-task-id>
```

---

## Architecture Rules (HARD REQUIREMENTS)

### Functional Programming Only

**This is a purely functional codebase. OOP is permanently banned.**

**Prohibited:**
- `class` keyword (no classes, ever)
- `this` keyword
- `new` keyword (except for built-ins like `Map`, `Set`, `Error`)
- Prototype manipulation
- Instance methods
- Inheritance hierarchies

**Required:**
- Pure functions that take data and return data
- Data as plain objects and arrays
- Composition over inheritance
- Explicit state passed as parameters

### Library-First Design

**blECSd is a library, not a framework.** Users must be able to:

1. Use components standalone in their own bitecs world
2. Skip the built-in update loop
3. Mix and match (use our input parsing but their own rendering)
4. Control the world (all functions take `world` as a parameter)

### Code Style

- **Early returns and guard clauses** - Handle errors first, happy path at the end
- **Maximum nesting depth of 2-3 levels**
- **Strict TypeScript** - No `any`, explicit return types, branded types for IDs
- **Zod validation** at system boundaries

---

## Documentation Requirements

### No Ticket Without Docs

Every ticket that adds or modifies public API MUST include:

1. **JSDoc comments** for all public exports with `@example`
2. **API reference page** in `docs/api/`
3. **Code examples** (at least one per function)
4. **Guide updates** if the feature affects existing guides

### JSDoc Standard

```typescript
/**
 * Brief description of what this does.
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 *
 * @example
 * ```typescript
 * import { thisFunction } from 'blecsd';
 * const result = thisFunction(value);
 * ```
 */
```

---

## Quality Gates

**Run these frequently, not just at the end.** Builds especially can catch errors that other tools miss (circular dependencies, export issues, bundler problems).

```bash
pnpm test             # Run tests
pnpm lint             # Run linter
pnpm typecheck        # TypeScript check
pnpm build            # Build - run often, catches different errors
```

---

## Session Completion (MANDATORY)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

### Checklist

1. **File issues for remaining work** - Create beads issues for anything that needs follow-up
2. **Run quality gates** (if code changed):
   ```bash
   pnpm test && pnpm lint && pnpm typecheck && pnpm build
   ```
3. **Update issue status** - Close finished work, update in-progress items
4. **Commit and push**:
   ```bash
   git add <files>
   git commit -m "<type>: <description>"
   bd sync
   git push
   ```
5. **Verify**:
   ```bash
   git status  # MUST show "up to date with origin"
   ```

### Critical Rules

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

---

## Commit Message Format

```
<type>: <description>

[optional body]

Refs: blessed-<hash>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

---

## Key Commands

| Command | Purpose |
|---------|---------|
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Run Biome linter |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm build` | Build for production |
| `bd ready` | Find available work |
| `bd sync` | Sync issues with git |

---

## Current Project State

To understand the current state:

```bash
bd stats              # Overall statistics
bd ready              # What can be worked on now
bd list --status=in_progress  # What's currently being worked on
bd blocked            # What's waiting on dependencies
```

For full project context, read:
- `CLAUDE.md` - Complete project documentation
- `docs/` - API and guide documentation
