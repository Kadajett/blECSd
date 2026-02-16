# Ralph Loop Prompt: Graphics

## Focus Area

Rich media rendering in terminals, going beyond text characters. Kitty proved that terminals can display images. iTerm2 added inline images. Sixel exists but is ancient. Nobody has built a proper library-level abstraction that makes rich graphics as easy as placing a text widget. blECSd should be the library where you write `createImage(world, { src: './logo.png', x: 10, y: 5 })` and it Just Works across terminal emulators.

## Goals (days of work)

1. **Unified graphics backend**: blECSd already has separate sixel, kitty, and iTerm2 image protocol implementations in `src/terminal/graphics/` and `src/media/`. Unify these behind a single API that auto-detects the best available protocol and falls back gracefully. The user should never think about which protocol to use. Add a braille-dot fallback for terminals with zero graphics support.

2. **Vector graphics primitives**: Build a terminal-native vector drawing API. Lines, arcs, filled rectangles, circles, bezier curves, rendered to braille characters (2x4 dot grid per cell = 160x200 effective resolution on an 80x50 terminal). This is the basis for rich charts, diagrams, and data visualization that goes beyond sparkline characters. Think: a mini Canvas API for the terminal.

3. **Image widget polish**: The existing `src/widgets/image.ts` exists but needs work. Add: automatic aspect ratio preservation, dithering options for low-color terminals, animated GIF support (the GIF parser already exists in `src/media/gif/`), image caching to avoid re-encoding on every frame, and proper cleanup of graphics resources on entity removal.

4. **Chart rendering upgrade**: The current chart widgets (sparkline, lineChart, gauge) render with text characters. Add a high-resolution mode that uses braille vector graphics for smooth curves and proper anti-aliasing. A sparkline rendered in braille has 4x the vertical resolution of one rendered with block characters.

5. **Terminal graphics capability proposal**: Write a technical proposal document for a standardized terminal graphics capability negotiation protocol. Current situation: apps have to probe for sixel/kitty/iTerm2 support with fragile heuristics. Proposal: a clean request/response sequence where the terminal declares its graphics capabilities (max resolution, color depth, animation support, compositing). This would live in `docs/proposals/` and could be submitted to terminal emulator maintainers.

## What to build

- Unified graphics API in `src/terminal/graphics/` with protocol auto-detection
- Vector drawing primitives (line, arc, rect, circle, bezier) rendered to braille
- Image widget improvements (aspect ratio, dithering, GIF animation, caching)
- High-resolution chart rendering mode using braille
- Technical proposal document for graphics capability negotiation
- Tests for all new functionality

## Quality gates

- Graphics auto-detection tested against mock terminal capabilities
- Vector primitives have visual snapshot tests
- Image widget handles all error cases (missing file, unsupported format, terminal too small)
- All new public APIs have JSDoc with examples

## Orchestration

Use Claude Code agent teams for parallel work. The workflow:

1. **Create the team**: `TeamCreate` with a name like `blecsd-graphics`
2. **Create git worktrees** before spawning workers: `git worktree add ../blECSd-w1 -b feat/unified-graphics-api` etc. Every worker MUST have its own worktree.
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
