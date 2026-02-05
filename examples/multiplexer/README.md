# Terminal Multiplexer Example

A tmux-like terminal multiplexer built with blECSd's Terminal widget.

## Features

- 2x2 grid of independent terminal panes
- Each pane runs its own shell (PTY)
- Tab/Shift+Tab to cycle focus
- Click to focus pane
- Create/close panes dynamically
- Visual focus indicator (colored border)
- Proper mouse support

## Requirements

This example requires `node-pty` for PTY (pseudo-terminal) support:

```bash
pnpm approve-builds  # Allow native module builds
pnpm install
```

## Running

```bash
# Development mode (recommended)
pnpm dev

# Or build and run
pnpm build
pnpm start
```

## Keybindings

| Key | Action |
|-----|--------|
| Tab | Focus next pane |
| Shift+Tab | Focus previous pane |
| Ctrl+N | Create new pane (max 4) |
| Ctrl+D | Close focused pane |
| Ctrl+Q | Quit multiplexer |
| Click | Focus clicked pane |

## How It Works

The multiplexer creates multiple Terminal widgets, each backed by its own PTY shell process. Input is routed to the focused pane, and each pane maintains independent scrollback history and terminal state.

Key implementation details:

1. **Pane Layout**: A 2x2 grid that dynamically adjusts when panes are added/removed
2. **Focus Management**: Visual border color indicates focused pane
3. **PTY Integration**: Each pane spawns an independent shell process
4. **Mouse Support**: Click to focus using SGR mouse tracking

## Architecture

```
┌─────────────────┬─────────────────┐
│                 │                 │
│     Pane 1      │     Pane 2      │
│    (Shell)      │    (Shell)      │
│                 │                 │
├─────────────────┼─────────────────┤
│                 │                 │
│     Pane 3      │     Pane 4      │
│    (Shell)      │    (Shell)      │
│                 │                 │
└─────────────────┴─────────────────┘
 Pane 1/4 ● Shell              Tab:Next  Ctrl+N:New  Ctrl+D:Close  Ctrl+Q:Quit
```

## Terminal Size

Requires minimum terminal size of 80x26 characters for 4 panes.
