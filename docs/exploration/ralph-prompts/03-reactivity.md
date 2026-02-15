# Ralph Loop Prompt: Reactivity

## Focus Area

Signal-based reactive UI patterns for terminal applications. The web moved from imperative DOM manipulation to declarative reactivity (React, Solid.js, Svelte). Terminal UIs are still stuck in the imperative era: manually calling `setText()`, `markDirty()`, `updateContent()`. blECSd should bring modern reactivity to terminals while staying true to its ECS architecture. The goal: declare what your UI looks like as a function of state, and the library handles the rest.

## Goals (days of work)

1. **Signal primitives**: Build a lightweight signal/reactive primitive system that integrates with bitecs ECS. Signals are observable values that automatically track dependencies. When a signal changes, only the dependent computations re-run. This is NOT React's virtual DOM diffing. This is fine-grained reactivity like Solid.js, but operating on ECS components instead of DOM nodes. A signal write to a position value should automatically mark the entity dirty and trigger only the systems that care about position changes.

2. **Computed properties**: Build on signals to support computed/derived values. Example: a gauge widget's fill width is computed from its value and width. Currently this is imperatively recalculated. With computed properties, `fillWidth = computed(() => Math.round(value() * width()))` would auto-update whenever value or width changes, and only re-render the gauge when fillWidth actually changes (not when value changes by an amount too small to affect the pixel output).

3. **Declarative widget composition**: Create a declarative API for composing widgets. Instead of imperative entity creation and component attachment, users should be able to describe their UI structure declaratively. This doesn't mean JSX or templates. It means functional composition: `const dashboard = layout(vertical, [header({title: 'Stats'}), gauge({value: cpuSignal}), list({items: logSignal})])`. The layout function returns entities wired up with reactive bindings.

4. **Reactive data sources**: Build adapters that turn external data into reactive signals. File watchers, process stdout streams, HTTP polling, WebSocket messages. Example: `const logs = fileSignal('/var/log/syslog')` creates a signal that updates whenever the file changes, and any widget bound to it re-renders automatically. This is where terminal UIs get truly powerful: live data without manual polling loops.

5. **Effect system for side effects**: Signals and computed values handle pure data flow. But terminal UIs also need side effects: writing to stdout, playing sounds, sending network requests. Build an effect system that lets users declare side effects that run in response to signal changes, properly batched and scheduled within the ECS update loop. Effects should respect the frame budget and never block input processing.

## What to build

- Signal primitive library in `src/core/signals.ts`
- Computed property system with automatic dependency tracking
- Declarative widget composition API in `src/core/declarative.ts`
- Reactive data source adapters (file, stream, interval, WebSocket)
- Effect system integrated with the ECS scheduler
- Tests for all reactivity primitives (especially edge cases: circular deps, diamond deps, async signals)
- Documentation with examples showing imperative vs declarative comparison

## Quality gates

- Signal system must have zero allocations in steady state (no GC pressure)
- Computed values must correctly handle diamond dependency graphs
- Circular dependency detection with clear error messages
- All reactive primitives work without the update loop (library-first principle)
- Benchmark: reactive updates must be faster than manual imperative equivalent

## Orchestration

Use Claude Code agent teams for parallel work. The workflow:

1. **Create the team**: `TeamCreate` with a name like `blecsd-reactivity`
2. **Create git worktrees** before spawning workers: `git worktree add ../blECSd-w1 -b feat/signal-primitives` etc. Every worker MUST have its own worktree.
3. **Create tasks** with `TaskCreate` for each work item
4. **Spawn workers** with `Task` tool using `subagent_type: "general-purpose"`, `model: "sonnet"`, `team_name`, and `mode: "bypassPermissions"`. Include the worktree path in each worker's prompt.
5. **Workers should**: implement, test, lint, typecheck, commit, and push their branch
6. **Lead validates** each worker's output: run tests, lint, typecheck, build on their worktree
7. **Merge to main** when validated, then rebase other workers: `git fetch origin && git rebase origin/main`
8. **Clean up**: shut down workers, delete team, remove worktrees

Key rules:
- Use Sonnet for workers, Opus for lead/planning
- Each worker gets ONE task, works in ONE worktree
- Never share worktrees between workers
- Commit with `--no-verify` after manual validation to skip slow pre-push hooks
- Always create git tags when bumping versions
