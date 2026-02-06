# Terminal Buffer Components API

ECS component for terminal emulator buffers with a 2D cell grid, cursor state, scrollback history, and ANSI escape sequence processing.

## Overview

The TerminalBuffer component provides a full terminal emulator buffer. It stores a 2D grid of styled cells, tracks cursor position and visibility, maintains scrollback history, supports alternate screen buffers, and processes ANSI/CSI escape sequences including SGR color codes, cursor movement, and erase commands.

## Import

```typescript
import {
  TerminalBuffer,
  setTerminalBuffer,
  hasTerminalBuffer,
  getTerminalState,
  getTerminalBuffer,
  writeChar,
  writeToTerminal,
  clearTerminal,
  resetTerminal,
  setCursorPosition,
  setCursorVisible,
  scrollTerminalUp,
  scrollTerminalDown,
  scrollTerminalToTop,
  scrollTerminalToBottom,
  resizeTerminalBuffer,
  removeTerminalBuffer,
  renderTerminalToAnsi,
  getTerminalCells,
} from 'blecsd';
```

## Component Data Layout

Scalar data stored in typed arrays:

```typescript
const TerminalBuffer = {
  isTerminal:      Uint8Array,   // Tag (1 = has terminal buffer)
  width:           Uint16Array,  // Width in columns
  height:          Uint16Array,  // Height in rows
  cursorX:         Uint16Array,  // Cursor column
  cursorY:         Uint16Array,  // Cursor row
  cursorVisible:   Uint8Array,   // 1=visible, 0=hidden
  scrollOffset:    Uint32Array,  // Scroll offset from top
  altScreenActive: Uint8Array,   // 1=alternate screen active
};
```

Complex state (cell buffer, scrollback, parser state) is stored in a separate `Map<Entity, TerminalState>`.

## Constants

```typescript
import {
  DEFAULT_TERMINAL_WIDTH,   // 80
  DEFAULT_TERMINAL_HEIGHT,  // 24
  DEFAULT_SCROLLBACK_LINES, // 1000
} from 'blecsd';
```

## Core Functions

### setTerminalBuffer

Initializes a terminal buffer on an entity. Configuration is validated with Zod.

```typescript
import { setTerminalBuffer } from 'blecsd';

setTerminalBuffer(world, entity, {
  width: 80,
  height: 24,
  scrollbackLines: 1000,
  cursorVisible: true,
  cursorShape: 'block',
  cursorBlink: true,
});
```

All options are optional and use defaults.

### hasTerminalBuffer

```typescript
import { hasTerminalBuffer } from 'blecsd';

if (hasTerminalBuffer(entity)) {
  // Entity has a terminal buffer
}
```

### getTerminalBuffer

Returns scalar terminal state.

```typescript
import { getTerminalBuffer } from 'blecsd';

const buf = getTerminalBuffer(entity);
if (buf) {
  console.log(`${buf.width}x${buf.height}, cursor at (${buf.cursorX}, ${buf.cursorY})`);
}
```

### getTerminalState

Returns the full internal state including cell buffer, scrollback, and parser state.

```typescript
import { getTerminalState } from 'blecsd';

const state = getTerminalState(entity);
// state.buffer, state.scrollback, state.currentAttr, etc.
```

## Writing

### writeChar

Writes a single character at the cursor position. Handles `\n`, `\r`, `\b`, `\t`.

```typescript
import { writeChar } from 'blecsd';

writeChar(world, entity, 'A');
writeChar(world, entity, '\n');
```

### writeToTerminal

Writes a string with ANSI escape sequence processing. Supports CSI sequences for cursor movement, SGR color codes (basic, 256-color, RGB), erase commands, and DEC private modes (cursor visibility, alternate screen buffer).

```typescript
import { writeToTerminal } from 'blecsd';

writeToTerminal(world, entity, '\x1b[31mRed text\x1b[0m Normal text\n');
writeToTerminal(world, entity, '\x1b[2J');  // Clear screen
```

## Cursor

### setCursorPosition / setCursorVisible

```typescript
import { setCursorPosition, setCursorVisible } from 'blecsd';

setCursorPosition(world, entity, 10, 5); // Column 10, row 5
setCursorVisible(world, entity, false);   // Hide cursor
```

## Scrolling

### scrollTerminalUp / scrollTerminalDown / scrollTerminalToTop / scrollTerminalToBottom

```typescript
import {
  scrollTerminalUp,
  scrollTerminalDown,
  scrollTerminalToTop,
  scrollTerminalToBottom,
} from 'blecsd';

scrollTerminalUp(world, entity, 5);    // Scroll up 5 lines into history
scrollTerminalDown(world, entity, 5);  // Scroll down 5 lines
scrollTerminalToTop(world, entity);    // Top of scrollback
scrollTerminalToBottom(world, entity); // Back to current view
```

## Terminal Management

### clearTerminal / resetTerminal

```typescript
import { clearTerminal, resetTerminal } from 'blecsd';

clearTerminal(world, entity);  // Clear cells, reset cursor
resetTerminal(world, entity);  // Full reset including scrollback and parser state
```

### resizeTerminalBuffer

Resizes the buffer, preserving existing content where possible.

```typescript
import { resizeTerminalBuffer } from 'blecsd';

resizeTerminalBuffer(world, entity, 120, 40);
```

### removeTerminalBuffer

Removes the terminal buffer and cleans up all state.

```typescript
import { removeTerminalBuffer } from 'blecsd';

removeTerminalBuffer(entity);
```

## Rendering

### renderTerminalToAnsi

Renders the terminal buffer to an ANSI string for display. Respects scroll offset.

```typescript
import { renderTerminalToAnsi } from 'blecsd';

const output = renderTerminalToAnsi(entity);
process.stdout.write(output);
```

### getTerminalCells

Returns the raw cell array for custom rendering.

```typescript
import { getTerminalCells } from 'blecsd';

const cells = getTerminalCells(entity);
// cells: readonly Cell[] | undefined
```

## Usage Example

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setTerminalBuffer, writeToTerminal, getTerminalBuffer, renderTerminalToAnsi } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Initialize terminal
setTerminalBuffer(world, entity, { width: 80, height: 24 });

// Write colored text
writeToTerminal(world, entity, '\x1b[32mHello, \x1b[1mWorld!\x1b[0m\n');

// Check state
const buf = getTerminalBuffer(entity);
console.log(`Cursor: (${buf?.cursorX}, ${buf?.cursorY})`);

// Render to ANSI
const output = renderTerminalToAnsi(entity);
```

## Types

### TerminalState

```typescript
interface TerminalState {
  readonly buffer: ScreenBufferData;
  readonly scrollback: ScrollbackBuffer;
  currentAttr: Attribute;
  escapeBuffer: string;
  inEscape: boolean;
  savedCursorX: number;
  savedCursorY: number;
  savedAttr: Attribute;
  altBuffer: ScreenBufferData | null;
  cursorShape: CursorShape;
  cursorBlink: boolean;
}
```

### CursorShape

```typescript
type CursorShape = 'block' | 'underline' | 'bar';
```

### TerminalBufferConfig

```typescript
interface TerminalBufferConfig {
  width?: number;           // default: 80
  height?: number;          // default: 24
  scrollbackLines?: number; // default: 1000
  cursorVisible?: boolean;  // default: true
  cursorShape?: CursorShape; // default: 'block'
  cursorBlink?: boolean;    // default: true
}
```
