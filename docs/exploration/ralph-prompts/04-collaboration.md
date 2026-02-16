# Ralph Loop Prompt: Collaboration

## Focus Area

Real-time shared terminal sessions and multiplayer terminal applications. No TUI library has this. tmux shares a session but everyone sees the same thing. SSH gives remote access but not collaboration. What if two people could interact with the same terminal dashboard simultaneously, each with their own cursor, their own focus, their own scroll position, but operating on shared state? This is Google Docs for the terminal.

## Goals (days of work)

1. **Session serialization and state sync**: Build the foundation: serialize the entire ECS world state into a compact binary format that can be transmitted over a network. This means serializing all component arrays, widget state maps, and entity relationships into a format that can be efficiently diffed and patched. Use delta compression so only changed state travels over the wire. Target: full state snapshot under 10KB for a typical dashboard, delta updates under 100 bytes for single-widget changes.

2. **Telnet/TCP server mode**: blECSd already has a `src/terminal/` module with program control. Build a server mode where blECSd listens on a TCP port and serves the terminal UI to connecting clients. Each client gets their own terminal negotiation (size, capabilities, color depth) but shares the application state. This is the infrastructure that makes everything else possible. Include proper authentication (at minimum a shared secret/token).

3. **Multi-cursor support**: When multiple users connect to the same session, each needs their own cursor position, focus state, selection state, and input queue. Extend the ECS to support per-session entity overlays: shared widgets with per-user focus/cursor/selection components layered on top. The rendering pipeline renders the shared state plus the per-user overlay for each connected client.

4. **Conflict resolution for shared state**: When two users modify the same widget simultaneously (both typing in the same text input, both scrolling the same list), the system needs a conflict resolution strategy. Build a simple operational transform or CRDT-based system for text inputs, and last-write-wins for discrete state (toggles, selections). The goal is not perfect collaboration semantics; it's "good enough that it feels natural."

5. **Presence and awareness**: Show which users are connected, where their cursors are, what they're interacting with. Render remote cursors as colored markers. Show a presence bar with connected user names. Emit events when users join/leave. This is the social layer that makes collaboration feel alive rather than mechanical.

6. **Proposal: Terminal collaboration protocol**: Write a technical proposal for a standardized terminal session sharing protocol. Current solutions (tmux, screen) operate at the byte stream level. A modern protocol would operate at the semantic level: shared widget tree, per-user input channels, capability negotiation per client. This could enable cross-terminal-emulator collaboration where one user is in kitty and another is in Windows Terminal. Document in `docs/proposals/`.

## What to build

- World state serialization/deserialization in `src/core/serialization.ts`
- Delta compression for state updates
- TCP server mode in `src/terminal/server.ts`
- Per-session entity overlay system
- Multi-cursor rendering in the output pipeline
- Conflict resolution primitives (CRDT for text, LWW for discrete state)
- Presence system with join/leave events
- Proposal document for terminal collaboration protocol
- Integration tests with multiple simulated clients

## Quality gates

- Serialization round-trip is lossless (serialize then deserialize = identical state)
- Delta compression achieves >90% reduction for typical updates
- Server handles at least 10 concurrent clients without frame drops
- Multi-cursor rendering doesn't degrade single-user performance
- All network code handles disconnection gracefully
- Security: no unauthenticated access, no injection via terminal sequences

## Orchestration

Use Claude Code agent teams for parallel work. The workflow:

1. **Create the team**: `TeamCreate` with a name like `blecsd-collab`
2. **Create git worktrees** before spawning workers: `git worktree add ../blECSd-w1 -b feat/state-serialization` etc. Every worker MUST have its own worktree.
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
