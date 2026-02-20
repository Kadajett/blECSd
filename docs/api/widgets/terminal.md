# Terminal Widget

The Terminal widget provides a terminal emulator with ANSI rendering and optional PTY (pseudo-terminal) support for spawning shell processes.

## Overview

```typescript
import { createWorld } from 'blecsd/core';
import { createTerminal } from 'blecsd/widgets';

const world = createWorld();
const terminal = createTerminal(world, {
  width: 80,
  height: 24,
  scrollback: 1000,
  border: { type: 'line' },
});

// Write ANSI content
terminal.write('\x1b[32mGreen text\x1b[0m');

// Or spawn a shell
terminal.spawn('/bin/bash');
terminal.destroy();
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
import { createWorld } from 'blecsd/core';
import { createTerminal } from 'blecsd/widgets';
const world = createWorld();
const terminal = createTerminal(world, { width: 80, height: 24 });

// Write content (supports ANSI escape sequences)
terminal.write('\x1b[32mGreen text\x1b[0m');

// Write with newline
terminal.writeln('Regular text');

// Clear screen
terminal.clear();

// Reset terminal state
terminal.reset();
terminal.destroy();
```

### Scrolling

```typescript
import { createWorld } from 'blecsd/core';
import { createTerminal } from 'blecsd/widgets';
const world = createWorld();
const termScroll = createTerminal(world, { width: 80, height: 24 });
termScroll.scrollUp(3);
termScroll.scrollDown(3);
termScroll.scrollToTop();
termScroll.scrollToBottom();
termScroll.destroy();
```

### Cursor Control

```typescript
import { createWorld } from 'blecsd/core';
import { createTerminal } from 'blecsd/widgets';
const world = createWorld();
const termCursor = createTerminal(world, { width: 80, height: 24 });
termCursor.setCursor(10, 5);
termCursor.showCursor();
termCursor.hideCursor();
termCursor.destroy();
```

### PTY Process (requires node-pty)

```typescript
import { createWorld } from 'blecsd/core';
import { createTerminal } from 'blecsd/widgets';
const world = createWorld();
const termPty = createTerminal(world, { width: 80, height: 24 });

// Spawn a shell
// termPty.spawn('/bin/bash');

// Spawn with options:
// termPty.spawn({ shell: '/bin/zsh', args: ['-l'], cwd: '/home/user', env: { TERM: 'xterm-256color' } });

// Send input to the PTY
// termPty.sendInput('ls\n');

// Resize the PTY
// termPty.resize(120, 40);

// Kill the process
// termPty.kill();

termPty.destroy();
```

### Events

```typescript
import { createWorld } from 'blecsd/core';
import { createTerminal } from 'blecsd/widgets';
const world = createWorld();
const termEvents = createTerminal(world, { width: 80, height: 24 });

// Data received from PTY
termEvents.onData((data) => {
  console.log('PTY data received:', data.length, 'bytes');
});

// Process exited
termEvents.onExit((code) => {
  console.log('PTY exited with code:', code);
});
termEvents.destroy();
```

### Widget Methods

```typescript
import { createWorld } from 'blecsd/core';
import { createTerminal } from 'blecsd/widgets';
const world = createWorld();
const termWidget = createTerminal(world, { width: 80, height: 24 });
termWidget.show();
termWidget.hide();
termWidget.focus();
termWidget.blur();
termWidget.destroy();
```

## Input Handling

Use `handleTerminalKey` to route keyboard input:

```typescript
import { createWorld } from 'blecsd/core';
import { createTerminal, handleTerminalKey } from 'blecsd/widgets';
const world = createWorld();
const termInput = createTerminal(world, { width: 80, height: 24 });

// Route keyboard events to the terminal
// program.on('key', (event) => {
//   handleTerminalKey(termInput, event.key, event.key, event.ctrl, event.alt, event.shift);
// });

// Direct call example: handleTerminalKey(widget, key, char, ctrl, alt, shift)
handleTerminalKey(termInput, 'a', 'a', false, false, false);
termInput.destroy();
```

## Examples

### Basic ANSI Display

```typescript
import { createWorld } from 'blecsd/core';
import { createTerminal } from 'blecsd/widgets';
const world = createWorld();

const termDisplay = createTerminal(world, {
  width: 80,
  height: 24,
  border: { type: 'line' },
  label: ' Output ',
});

termDisplay.write('\x1b[1;34mBold Blue\x1b[0m\n');
termDisplay.write('\x1b[41;37mWhite on Red\x1b[0m\n');
termDisplay.writeln('Regular text');
termDisplay.destroy();
```

### Interactive Shell

```typescript
import { createWorld } from 'blecsd/core';
import { createTerminal } from 'blecsd/widgets';
const world = createWorld();

const termShell = createTerminal(world, {
  width: 120,
  height: 40,
});

termShell.onData(() => {
  // Terminal content updated, trigger re-render
});

termShell.onExit((code) => {
  termShell.writeln(`\nProcess exited with code ${code}`);
});

// Spawn shell (requires node-pty):
// termShell.spawn('/bin/bash');

// Route keyboard input via handleTerminalKey
termShell.destroy();
```

### ANSI Art Viewer

```typescript
import { createWorld } from 'blecsd/core';
import { createTerminal } from 'blecsd/widgets';

const world = createWorld();
const termArt = createTerminal(world, {
  width: 82,  // Standard ANSI art width + borders
  height: 60,
  scrollback: 0,  // No scrollback for art
});

// Write CP437-encoded ANSI art content
termArt.write('\x1b[32mANSI Art Content\x1b[0m');
termArt.destroy();
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
- [Examples: Multiplexer](https://github.com/Kadajett/blECSd-Examples) - tmux-like terminal manager
- [Examples: ANSI Viewer](https://github.com/Kadajett/blECSd-Examples) - Classic ANSI art browser
