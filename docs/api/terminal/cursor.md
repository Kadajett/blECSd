# Artificial Cursor API

Software-rendered cursor that bypasses the terminal's native cursor.

## Overview

The artificial cursor system provides:
- Custom cursor shapes (block, underline, bar)
- Custom cursor colors
- Configurable blink rate
- Multi-cursor support
- Integration with terminal cursor hiding

## Quick Start

```typescript
import {
  createArtificialCursor,
  renderCursor,
  updateCursorBlink,
  isCursorVisible,
  hideTerminalCursor,
  createCell,
} from 'blecsd/terminal';

// Hide the terminal's native cursor
process.stdout.write(hideTerminalCursor());

// Create an artificial cursor
let cursor = createArtificialCursor({
  x: 10,
  y: 5,
  shape: 'block',
  blink: true,
});

// In render loop
function render(time: number) {
  cursor = updateCursorBlink(cursor, time);

  if (isCursorVisible(cursor)) {
    const originalCell = createCell(' ', 0xffffffff, 0xff000000);
    const rendered = renderCursor(cursor, originalCell);
    void rendered.cell;
  }
}

void render;
```

## Creating Cursors

### createArtificialCursor

Create a new artificial cursor with configurable options.

```typescript
import { createArtificialCursor } from 'blecsd/terminal';

// Basic cursor
const cursor = createArtificialCursor();

// Customized cursor
const customCursor = createArtificialCursor({
  x: 10,
  y: 5,
  shape: 'underline',
  blink: true,
  blinkRate: 400,
  fgColor: 0xff0000ff,  // Red
});
```

### ArtificialCursorOptions

```typescript
interface ArtificialCursorOptions {
  readonly x?: number;        // Initial X position (default: 0)
  readonly y?: number;        // Initial Y position (default: 0)
  readonly visible?: boolean; // Initial visibility (default: true)
  readonly shape?: CursorShape; // Cursor shape (default: 'block')
  readonly blink?: boolean;   // Enable blinking (default: true)
  readonly blinkRate?: number; // Blink rate in ms (default: 530)
  readonly fgColor?: number;  // Custom foreground color
  readonly bgColor?: number;  // Custom background color
  readonly id?: string;       // Cursor ID for multi-cursor
}

type CursorShape = 'block' | 'underline' | 'bar';
```

## Cursor Shapes

### Block Cursor

Full cell coverage, most visible. Renders the character with inverted colors.

```typescript
const blockCursor = createArtificialCursor({ shape: 'block' });
```

### Underline Cursor

Bottom edge of cell. Uses lower one-eighth block character.

```typescript
const underlineCursor = createArtificialCursor({ shape: 'underline' });
```

### Bar Cursor

Left edge of cell (I-beam style). Uses left one-eighth block character.

```typescript
const barCursor = createArtificialCursor({ shape: 'bar' });
```

## Moving Cursors

### moveCursorTo

Move cursor to absolute position.

```typescript
import { createArtificialCursor, moveCursorTo } from 'blecsd/terminal';

let cursor = createArtificialCursor();
cursor = moveCursorTo(cursor, 15, 10);
```

### moveCursorBy

Move cursor by delta.

```typescript
import { createArtificialCursor, moveCursorBy } from 'blecsd/terminal';

let cursor = createArtificialCursor();
cursor = moveCursorBy(cursor, 1, 0);  // Move right
cursor = moveCursorBy(cursor, 0, -1); // Move up
```

## Cursor State

### setCursorVisible

```typescript
import { createArtificialCursor, setCursorVisible } from 'blecsd/terminal';

let cursor = createArtificialCursor();
cursor = setCursorVisible(cursor, false); // Hide
cursor = setCursorVisible(cursor, true);  // Show
```

### setCursorShape

```typescript
import { createArtificialCursor, setCursorShape } from 'blecsd/terminal';

let cursor = createArtificialCursor();
cursor = setCursorShape(cursor, 'underline');
```

### setCursorBlink

```typescript
import { createArtificialCursor, setCursorBlink } from 'blecsd/terminal';

let cursor = createArtificialCursor();
cursor = setCursorBlink(cursor, true, 400); // Enable with 400ms rate
cursor = setCursorBlink(cursor, false);     // Disable
```

### setCursorColors

```typescript
import { createArtificialCursor, setCursorColors } from 'blecsd/terminal';
import { packColor } from 'blecsd/components';

let cursor = createArtificialCursor();

// Red cursor on black background
cursor = setCursorColors(cursor, packColor(255, 0, 0), packColor(0, 0, 0));

// Reset to inverse (default)
cursor = setCursorColors(cursor, undefined, undefined);
```

## Blink Handling

### updateCursorBlink

Update cursor blink state based on elapsed time. Call every frame.

```typescript
import { createArtificialCursor, updateCursorBlink } from 'blecsd/terminal';

let cursor = createArtificialCursor();

function gameLoop() {
  cursor = updateCursorBlink(cursor, performance.now());
  // ... render
}
```

### resetCursorBlink

Force blink state to on. Useful after user input.

```typescript
import { createArtificialCursor, resetCursorBlink } from 'blecsd/terminal';

let cursor = createArtificialCursor();

// On keypress, restart blink cycle
cursor = resetCursorBlink(cursor, performance.now());
```

### isCursorVisible

Check if cursor should be rendered (considering blink state).

```typescript
import { createArtificialCursor, isCursorVisible } from 'blecsd/terminal';

const cursor = createArtificialCursor();
if (isCursorVisible(cursor)) {
  // renderCursorCell(cursor);
  void cursor;
}
```

## Rendering

### renderCursor

Apply cursor styling to an existing cell.

```typescript
import { createArtificialCursor, renderCursor, createCell } from 'blecsd/terminal';

const cursor = createArtificialCursor();
const originalCell = createCell(' ', 0xffffffff, 0xff000000);
const result = renderCursor(cursor, originalCell);

if (result.fullCell) {
  // Block cursor replaces entire cell
  void result.cell;
} else {
  // Underline/bar overlays partial cell
  void result.cell;
}
```

### createCursorCell

Create a cell for just the cursor character.

```typescript
import { createArtificialCursor, createCursorCell } from 'blecsd/terminal';

const cursor = createArtificialCursor();
const cursorCell = createCursorCell(cursor);
void cursorCell;
```

## Multi-Cursor Support

### CursorManager

Manage multiple cursors with a primary cursor.

```typescript
import {
  createArtificialCursor,
  createCursorManager,
  getPrimaryCursor,
  addCursor,
  removeCursor,
  getVisibleCursors,
} from 'blecsd/terminal';

// Create manager
let manager = createCursorManager();

// Get primary cursor
const primary = getPrimaryCursor(manager);
void primary;

// Add secondary cursor
const secondary = createArtificialCursor({ id: 'secondary', x: 20, y: 10 });
manager = addCursor(manager, secondary);

// Remove cursor (cannot remove primary)
manager = removeCursor(manager, 'secondary');

// Get all visible cursors for rendering
const visible = getVisibleCursors(manager);
void visible;
```

### updateAllCursorBlinks

Update blink state for all cursors in manager.

```typescript
import { createCursorManager, updateAllCursorBlinks } from 'blecsd/terminal';

let manager = createCursorManager();
manager = updateAllCursorBlinks(manager, performance.now());
```

### getCursorAt

Get cursor at a specific position.

```typescript
import { createCursorManager, getCursorAt } from 'blecsd/terminal';

const manager = createCursorManager();
const cursor = getCursorAt(manager, 10, 5);
if (cursor) {
  // There's a cursor here
}
```

## Terminal Integration

### Hiding Terminal Cursor

When using artificial cursors, hide the terminal's native cursor.

```typescript
import { hideTerminalCursor, showTerminalCursor } from 'blecsd/terminal';

// Enter artificial cursor mode
process.stdout.write(hideTerminalCursor());

// ... game loop with artificial cursor ...

// Exit artificial cursor mode
process.stdout.write(showTerminalCursor());
```

### Constants

```typescript
import {
  // '\x1b[?25l'
  SHOW_TERMINAL_CURSOR,
  // '\x1b[?25h'
  BLOCK_CURSOR_CHAR,
  // '\u2588' (full block)
  UNDERLINE_CURSOR_CHAR,
  // '\u2581' (lower one eighth)
  BAR_CURSOR_CHAR,
  HIDE_TERMINAL_CURSOR,
} from 'blecsd/terminal';
```

## Example: Text Editor Cursor

```typescript
import {
  createArtificialCursor,
  moveCursorTo,
  moveCursorBy,
  updateCursorBlink,
  renderCursor,
  resetCursorBlink,
  isCursorVisible,
  createCell,
  hideTerminalCursor,
  showTerminalCursor,
} from 'blecsd/terminal';

// Initialize
process.stdout.write(hideTerminalCursor());

let cursor = createArtificialCursor({
  shape: 'bar',  // I-beam for text editing
  blink: true,
  blinkRate: 530,
});

// Handle keyboard input
function onKeyDown(key: string) {
  switch (key) {
    case 'ArrowRight':
      cursor = moveCursorBy(cursor, 1, 0);
      break;
    case 'ArrowLeft':
      cursor = moveCursorBy(cursor, -1, 0);
      break;
    // ... handle other keys
  }

  // Reset blink on activity
  cursor = resetCursorBlink(cursor, performance.now());
}

// Render loop
function render(time: number) {
  cursor = updateCursorBlink(cursor, time);

  if (isCursorVisible(cursor)) {
    const originalCell = createCell(' ', 0xffffffff, 0xff000000);
    const result = renderCursor(cursor, originalCell);
    void result.cell;
  }

  // Output to terminal
  // ...
}

void onKeyDown;
void render;
void moveCursorTo;

// Cleanup
process.on('exit', () => {
  process.stdout.write(showTerminalCursor());
});
```

## Performance Tips

1. **Cache rendered cursor** when not blinking
2. **Only update changed cells** when cursor moves
3. **Use requestAnimationFrame** for smooth blink animation
4. **Batch cursor updates** in multi-cursor scenarios
