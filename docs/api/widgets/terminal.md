# Terminal Widget

The Terminal widget provides a terminal emulator with ANSI rendering and optional PTY (pseudo-terminal) support for spawning shell processes.

## Overview

```typescript
import { createWorld } from 'blecsd';
import { createTerminal } from 'blecsd/widgets';

const world = createWorld();
const terminal = createTerminal(world, {
  width: 80,
  height: 24,
  scrollback: 1000,
  border: 'single',
});

// Write ANSI content
terminal.write('\x1b[32mGreen text\x1b[0m');

// Or spawn a shell
terminal.spawn('/bin/bash');
```

## Features

- **ANSI Rendering**: Full support for SGR codes (colors, styles), cursor control, and screen manipulation
- **PTY Support**: Spawn interactive shells with proper terminal handling (requires `node-pty`)
- **Scrollback Buffer**: Configurable history with scroll navigation
- **Cursor Control**: Software cursor with visibility toggle
- **Input Handling**: Keyboard input routing to PTY processes

## Configuration

```typescript
interface TerminalConfig {
  // Terminal dimensions
  width?: number;          // Columns (default: 80)
  height?: number;         // Rows (default: 24)
  scrollback?: number;     // Max scrollback lines (default: 1000)

  // Cursor options
  cursorBlink?: boolean;   // Blink cursor (default: false)
  cursorShape?: 'block' | 'underline' | 'bar';

  // Standard widget options
  left?: PositionValue;
  top?: PositionValue;
  border?: BorderConfig;
  style?: { fg?: number; bg?: number };
  label?: string;
}
```

## API

### Content Methods

```typescript
// Write content (supports ANSI escape sequences)
terminal.write(data: string): TerminalWidget;

// Write with newline
terminal.writeln(data: string): TerminalWidget;

// Clear screen
terminal.clear(): TerminalWidget;

// Reset terminal state
terminal.reset(): TerminalWidget;
```

### Scrolling

```typescript
terminal.scrollUp(lines?: number): TerminalWidget;
terminal.scrollDown(lines?: number): TerminalWidget;
terminal.scrollToTop(): TerminalWidget;
terminal.scrollToBottom(): TerminalWidget;
```

### Cursor Control

```typescript
terminal.setCursor(x: number, y: number): TerminalWidget;
terminal.showCursor(): TerminalWidget;
terminal.hideCursor(): TerminalWidget;
```

### PTY Process (requires node-pty)

```typescript
// Spawn a shell
terminal.spawn(shell?: string): TerminalWidget;

// Spawn with options
terminal.spawn({
  shell: '/bin/zsh',
  args: ['-l'],
  cwd: '/home/user',
  env: { TERM: 'xterm-256color' },
}): TerminalWidget;

// Send input to the PTY
terminal.sendInput(data: string): TerminalWidget;

// Resize the PTY
terminal.resize(cols: number, rows: number): TerminalWidget;

// Kill the process
terminal.kill(signal?: string): TerminalWidget;
```

### Events

```typescript
// Data received from PTY
terminal.onData(callback: (data: string) => void): TerminalWidget;

// Process exited
terminal.onExit(callback: (code: number) => void): TerminalWidget;
```

### Widget Methods

```typescript
terminal.show(): TerminalWidget;
terminal.hide(): TerminalWidget;
terminal.focus(): TerminalWidget;
terminal.blur(): TerminalWidget;
terminal.destroy(): void;
```

## Input Handling

Use `handleTerminalKey` to route keyboard input:

```typescript
import { handleTerminalKey } from 'blecsd/widgets';

program.on('key', (event) => {
  handleTerminalKey(terminal, event.key, {
    ctrl: event.ctrl,
    alt: event.alt,
    shift: event.shift,
  });
});
```

## Examples

### Basic ANSI Display

```typescript
const terminal = createTerminal(world, {
  width: 80,
  height: 24,
  border: 'single',
  label: ' Output ',
});

terminal.write('\x1b[1;34mBold Blue\x1b[0m\n');
terminal.write('\x1b[41;37mWhite on Red\x1b[0m\n');
terminal.writeln('Regular text');
```

### Interactive Shell

```typescript
const terminal = createTerminal(world, {
  width: 120,
  height: 40,
});

terminal.spawn('/bin/bash');

terminal.onData(() => {
  // Terminal content updated, trigger re-render
  markDirty(world, terminal.eid);
});

terminal.onExit((code) => {
  terminal.writeln(`\nProcess exited with code ${code}`);
});

// Route keyboard input
program.on('key', (event) => {
  handleTerminalKey(terminal, event.key, event);
});
```

### ANSI Art Viewer

```typescript
import { encoding } from 'blecsd';

// Load CP437-encoded ANSI art
const buffer = await fetch(artUrl).then(r => r.arrayBuffer());
const content = encoding.bufferToString(Buffer.from(buffer), 'cp437');

const terminal = createTerminal(world, {
  width: 82,  // Standard ANSI art width + borders
  height: 60,
  scrollback: 0,  // No scrollback for art
});

terminal.write(content);
```

## ANSI Escape Sequences

The Terminal widget supports:

| Category | Codes |
|----------|-------|
| **Colors** | 16-color, 256-color, 24-bit RGB |
| **Styles** | Bold, dim, italic, underline, blink, inverse, strikethrough |
| **Cursor** | Move (A/B/C/D), position (H), save/restore |
| **Erase** | Line (K), screen (J) |
| **Scroll** | Up (S), down (T) |

## PTY Requirements

For shell spawning, install `node-pty`:

```bash
pnpm add node-pty
pnpm add -D @types/node-pty
```

The Terminal widget gracefully degrades if `node-pty` is not available, logging a warning when `spawn()` is called.

## Related

- [Encoding Utilities](../utils/encoding.md) - CP437 encoding for ANSI art
- [ANSI Parser](../ansi.md) - Low-level ANSI parsing
- [Examples: Multiplexer](../../examples/index.md#multiplexer) - tmux-like terminal manager
- [Examples: ANSI Viewer](../../examples/index.md#ansi-art-viewer) - Classic ANSI art browser
