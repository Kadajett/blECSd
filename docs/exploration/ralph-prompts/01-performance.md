# Ralph Loop Prompt: Performance

## Focus Area

Rendering pipeline optimization, memory efficiency, frame budgeting, and ECS hot-path tuning. blECSd's ECS architecture is its core differentiator, and performance is what makes that differentiator real. A terminal UI library that handles 10M+ line virtualized lists needs a rendering pipeline that never drops frames, never leaks memory, and never makes the user wait.

## Goals (days of work)

1. **Rendering pipeline audit and optimization**: Profile the full render cycle (layout, dirty rect computation, cell diffing, output flushing) and eliminate bottlenecks. The output system currently rebuilds ANSI sequences every frame for every dirty cell. Implement sequence caching, batch SGR attribute changes, and reduce string allocations. Target: sub-2ms full-screen redraw on a 200x50 terminal.

2. **Memory pressure and GC tuning**: The ECS uses TypedArrays (good) but widget state maps use regular JS objects and Maps (bad for GC pressure). Audit all widget state storage for GC-unfriendly patterns. Consider moving hot widget state into TypedArray-backed stores. Profile memory allocation per frame and target zero allocations in steady-state rendering.

3. **Adaptive frame budgeting**: The frame budget system exists but is basic. Make it smarter: dynamically adjust work per frame based on actual frame times, defer non-critical updates (animations, background repaints) when the budget is tight, and prioritize input processing above all else. Add frame time telemetry that users can opt into.

4. **Packed store integration for hot paths**: The packed entity store adapter exists but isn't used on the hottest paths (scroll rendering, cell diffing, dirty tracking). Profile and integrate packed stores where they provide measurable wins. Benchmark before/after.

5. **Benchmark suite expansion**: The existing benchmarks cover basics but miss real-world scenarios. Add benchmarks for: large scrollable list with search active, rapid window resizing, 60fps animation with layout recalculation, and concurrent widget updates. These should run in CI and block PRs that regress.

## What to build

- Optimize `outputSystem.ts` rendering pipeline (sequence caching, batch SGR)
- Reduce per-frame allocations in hot paths (layout system, dirty tracking, cell diffing)
- Enhance `frameBudget.ts` with adaptive scheduling
- Integrate packed stores into scroll rendering and cell diffing
- Add real-world benchmarks to `benchmarks/` directory
- Add frame time telemetry API for users

## Quality gates

- All changes must have before/after benchmark numbers
- No regressions in existing benchmarks
- All new code has tests
- JSDoc on all public APIs

## Orchestration

Use Claude Code agent teams for parallel work. The workflow:

1. **Create the team**: `TeamCreate` with a descriptive name like `blecsd-perf`
2. **Create git worktrees** before spawning workers: `git worktree add ../blECSd-w1 -b feat/perf-render-pipeline` etc. Every worker MUST have its own worktree.
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
