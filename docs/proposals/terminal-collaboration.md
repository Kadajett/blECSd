# Proposal: Terminal Collaboration Protocol (TCP/S)

**Author:** blECSd project
**Status:** Draft
**Created:** 2026-02-13

## Abstract

Current terminal session sharing operates at the byte stream level. tmux and screen multiplex a single character stream, meaning all users see exactly the same thing and share a single cursor. SSH provides remote access but not collaboration.

This proposal defines a Terminal Collaboration Protocol (TCP/S, Terminal Collaboration Protocol over Sessions) that enables semantic-level terminal session sharing. Each connected user gets their own cursor, focus state, and scroll position while operating on shared application state. The protocol works across different terminal emulators and supports capability negotiation per client.

## Motivation

### Current limitations

1. **tmux/screen**: Share a byte stream. All users see the same viewport. One cursor. No per-user state. Resizing affects everyone.

2. **SSH**: One user per session. No sharing model. Separate processes, separate state.

3. **VS Code Live Share**: Proves collaborative editing works, but only for editors. Terminal applications have no equivalent.

4. **AI agent workflows**: Multi-agent systems need shared terminal dashboards where each agent has independent focus and input, but all see the same data.

### What collaboration means for terminals

True terminal collaboration means:
- Multiple users see the same application UI
- Each user has their own cursor, focus, and scroll position
- Users can interact independently (scroll different lists, focus different inputs)
- Changes to shared state are visible to all users immediately
- Per-client terminal capability negotiation (one user in kitty, another in Windows Terminal)

## Architecture

### Three-Layer Model

```
Layer 3: Per-User State    (cursor, focus, scroll, selection)
Layer 2: Shared State      (ECS world, widget state, content)
Layer 1: Transport         (TCP, WebSocket, IPC)
```

**Layer 1 (Transport)** handles connection, authentication, and message framing. Multiple transports are supported: raw TCP for local networks, WebSocket for browser-based clients, Unix domain sockets for same-machine collaboration.

**Layer 2 (Shared State)** is the ECS world state. All connected users share the same entity/component data. Changes from any user are applied to the shared state and broadcast to all clients. This layer uses the serialization system (`src/core/serialization.ts`) for state snapshots and delta updates.

**Layer 3 (Per-User State)** is layered on top of shared state. Each connected user has:
- Cursor position (which cell the cursor is on)
- Focus stack (which widget has focus for this user)
- Scroll positions (per-widget scroll offset)
- Selection state (text selections, list selections)
- Input queue (pending keystrokes)

### Session Model

```
                    +------------------+
                    |   Server World   |
                    |  (Shared State)  |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
        +-----+-----+  +----+------+  +----+------+
        |  Client A  |  |  Client B |  |  Client C |
        |  Overlay   |  |  Overlay  |  |  Overlay  |
        | (Per-User) |  | (Per-User)|  | (Per-User)|
        +-----+------+  +----+------+  +----+------+
              |              |              |
        +-----+------+  +----+------+  +----+------+
        | Terminal A  |  | Terminal B|  | Terminal C|
        | (kitty)     |  | (iTerm2) |  | (WinTerm) |
        +-----------+  +-----------+  +-----------+
```

### Message Types

#### Client -> Server

| Message | Purpose |
|---------|---------|
| `AUTH` | Authenticate with token/credentials |
| `CAPS` | Report terminal capabilities (size, colors, features) |
| `INPUT` | Send keystroke or mouse event |
| `SCROLL` | Update per-user scroll position |
| `FOCUS` | Change focus to a widget |
| `RESIZE` | Report terminal size change |
| `PING` | Keepalive |

#### Server -> Client

| Message | Purpose |
|---------|---------|
| `SNAPSHOT` | Full world state (on connect or resync) |
| `DELTA` | Incremental state update |
| `RENDER` | Per-client render instructions |
| `CURSOR` | Remote cursor positions (other users) |
| `PRESENCE` | User join/leave events |
| `PONG` | Keepalive response |

### Wire Format

Messages use a binary header followed by a payload:

```
+--------+--------+--------+--------+
| Type   | Flags  | Length (uint16)  |
+--------+--------+--------+--------+
|          Payload (variable)        |
+------------------------------------+
```

- **Type** (1 byte): Message type enum
- **Flags** (1 byte): Compression flag, priority bits
- **Length** (2 bytes): Payload length (max 65535 bytes)
- **Payload**: JSON (v1) or MessagePack (v2)

## Per-User State Overlay

The key innovation is per-user entity overlays. Shared components (Position, Content, Style) are stored once. Per-user components (Cursor, Focus, Scroll) are stored per-session.

### ECS Integration

```typescript
// Shared components (same for all users)
Position.x[eid] = 10;  // All users see this entity at x=10
Content.text[eid] = "Hello";  // All users see "Hello"

// Per-user components (different per session)
SessionFocus.focused[sessionId][eid] = 1;  // Only this user has focus here
SessionScroll.y[sessionId][eid] = 42;  // This user scrolled to line 42
SessionCursor.x[sessionId] = 15;  // This user's cursor is at column 15
```

### Rendering Pipeline Extension

The render pipeline adds a per-user compositing step:

1. **Shared render**: Render the base UI (same for all users)
2. **Overlay render**: For each connected client, composite their per-user state:
   - Apply their scroll offsets to scrollable widgets
   - Render their cursor position
   - Highlight their focused widget
   - Show remote cursors from other users (colored markers)
3. **Capability adaptation**: Adjust output for each client's terminal:
   - 256-color fallback for terminals without true color
   - ASCII fallback for terminals without Unicode
   - Size-adaptive layout for different terminal dimensions

## Conflict Resolution

### Discrete State (Last-Write-Wins)

For toggles, selections, radio buttons, and other discrete state, last-write-wins is sufficient. The server timestamps each mutation and the latest timestamp wins.

```typescript
interface Mutation {
  readonly entityId: number;
  readonly component: string;
  readonly field: string;
  readonly value: number;
  readonly timestamp: number;
  readonly sessionId: string;
}
```

### Text Input (Operational Transform)

For text inputs where two users might type simultaneously, use a simplified OT model:

```typescript
type TextOp =
  | { type: 'insert'; position: number; text: string }
  | { type: 'delete'; position: number; length: number };

function transformOps(
  localOp: TextOp,
  remoteOp: TextOp
): [TextOp, TextOp]
```

The server maintains the canonical text state. Clients send operations, the server transforms them against concurrent operations, and broadcasts the result. This is a well-understood problem with existing solutions.

### Scroll Position (Independent)

Scroll positions are per-user and never conflict. Each user scrolls independently.

## Presence System

### User State

```typescript
interface UserPresence {
  readonly sessionId: string;
  readonly name: string;
  readonly color: number;  // Assigned cursor color (from a palette)
  readonly connectedAt: number;
  readonly lastActivity: number;
  readonly cursorPosition: { x: number; y: number } | null;
  readonly focusedEntity: number | null;
  readonly status: 'active' | 'idle' | 'away';
}
```

### Remote Cursor Rendering

Remote cursors are rendered as colored cell highlights. Each user is assigned a color from a distinguishable palette. The cursor shows the user's name in a tooltip-style overlay when hovered.

### Events

```typescript
type PresenceEvent =
  | { type: 'join'; user: UserPresence }
  | { type: 'leave'; sessionId: string }
  | { type: 'cursor_move'; sessionId: string; x: number; y: number }
  | { type: 'focus_change'; sessionId: string; entityId: number | null }
  | { type: 'status_change'; sessionId: string; status: string };
```

## Security

### Authentication

- Shared secret token (minimum viable): Server generates a token, clients connect with it
- Future: OAuth/OIDC integration for identity-based access control

### Authorization

- Read-only mode: User can see the session but not interact
- Input-only mode: User can type but not modify shared state (useful for demonstrations)
- Full mode: User can interact fully

### Terminal Sequence Injection

Remote user input must be sanitized before being processed. A malicious client must not be able to inject terminal escape sequences that affect other users' terminals. All input goes through the application's input parser, never directly to other terminals.

## Performance Targets

| Metric | Target |
|--------|--------|
| Full snapshot size | < 10KB for typical dashboard |
| Delta update size | < 100 bytes for single-widget change |
| Concurrent clients | 10+ without frame drops |
| Input latency | < 50ms from keypress to render update |
| Bandwidth per client | < 10KB/s steady state |

## Implementation Phases

### Phase 1: Serialization Foundation
- World state serialization/deserialization
- Delta compression
- Round-trip fidelity tests

### Phase 2: Server Mode
- TCP listener with authentication
- Client connection management
- State broadcast to connected clients
- Per-client render adaptation

### Phase 3: Per-User State
- Session overlay components
- Multi-cursor rendering
- Independent focus/scroll per user

### Phase 4: Conflict Resolution
- Last-write-wins for discrete state
- OT for text inputs
- Conflict event notifications

### Phase 5: Presence
- User join/leave events
- Remote cursor display
- Presence bar widget
- Activity status tracking

## Relationship to STOP

The Structured Terminal Output Protocol (STOP) proposed separately complements TCP/S. STOP defines how to emit semantic output blocks. TCP/S defines how to share those blocks across users. Together, they enable:

- Collaborative code review where each reviewer can independently collapse/expand code blocks
- Shared dashboards where each user can scroll different panels
- Multi-agent AI workflows where each agent has its own view into shared state

## Open Questions

1. **Transport selection**: TCP is simple but doesn't traverse NATs. WebSocket works through proxies. Should the protocol be transport-agnostic?

2. **State reconciliation**: If a client disconnects and reconnects, should they get a fresh snapshot or attempt to replay missed deltas?

3. **Maximum clients**: Is 10 concurrent clients enough? What changes for 100+?

4. **Undo/redo**: Should the protocol support multi-user undo? This is significantly more complex than single-user undo.

5. **Voice/chat**: Should the protocol include a text chat channel for collaborators, or is that out of scope?

## References

- [Operational Transformation (Wikipedia)](https://en.wikipedia.org/wiki/Operational_transformation)
- [CRDTs: Conflict-free Replicated Data Types](https://crdt.tech/)
- [tmux architecture](https://github.com/tmux/tmux/wiki/Getting-Started)
- [VS Code Live Share protocol](https://docs.microsoft.com/en-us/visualstudio/liveshare/)
- [blECSd Structured Output Protocol (STOP)](./structured-output.md)
