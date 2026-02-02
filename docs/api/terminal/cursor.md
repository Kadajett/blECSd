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
} from 'blecsd';

// Hide the terminal's native cursor
process.stdout.write(hideTerminalCursor());

// Create an artificial cursor
const cursor = createArtificialCursor({
  x: 10,
  y: 5,
  shape: 'block',
  blink: true,
});

// In render loop
function render(time: number) {
  const updated = updateCursorBlink(cursor, time);

  if (isCursorVisible(updated)) {
    const rendered = renderCursor(updated, getCell(updated.x, updated.y));
    setCell(updated.x, updated.y, rendered.cell);
  }
}
```

## Creating Cursors

### createArtificialCursor

Create a new artificial cursor with configurable options.

```typescript
import { createArtificialCursor } from 'blecsd';

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
import { moveCursorTo } from 'blecsd';

cursor = moveCursorTo(cursor, 15, 10);
```

### moveCursorBy

Move cursor by delta.

```typescript
import { moveCursorBy } from 'blecsd';

cursor = moveCursorBy(cursor, 1, 0);  // Move right
cursor = moveCursorBy(cursor, 0, -1); // Move up
```

## Cursor State

### setCursorVisible

```typescript
import { setCursorVisible } from 'blecsd';

cursor = setCursorVisible(cursor, false); // Hide
cursor = setCursorVisible(cursor, true);  // Show
```

### setCursorShape

```typescript
import { setCursorShape } from 'blecsd';

cursor = setCursorShape(cursor, 'underline');
```

### setCursorBlink

```typescript
import { setCursorBlink } from 'blecsd';

cursor = setCursorBlink(cursor, true, 400); // Enable with 400ms rate
cursor = setCursorBlink(cursor, false);     // Disable
```

### setCursorColors

```typescript
import { setCursorColors, packColor } from 'blecsd';

// Red cursor on black background
cursor = setCursorColors(cursor, packColor(255, 0, 0), packColor(0, 0, 0));

// Reset to inverse (default)
cursor = setCursorColors(cursor, undefined, undefined);
```

## Blink Handling

### updateCursorBlink

Update cursor blink state based on elapsed time. Call every frame.

```typescript
import { updateCursorBlink } from 'blecsd';

function gameLoop() {
  cursor = updateCursorBlink(cursor, performance.now());
  // ... render
}
```

### resetCursorBlink

Force blink state to on. Useful after user input.

```typescript
import { resetCursorBlink } from 'blecsd';

// On keypress, restart blink cycle
cursor = resetCursorBlink(cursor, performance.now());
```

### isCursorVisible

Check if cursor should be rendered (considering blink state).

```typescript
import { isCursorVisible } from 'blecsd';

if (isCursorVisible(cursor)) {
  renderCursorCell(cursor);
}
```

## Rendering

### renderCursor

Apply cursor styling to an existing cell.

```typescript
import { renderCursor } from 'blecsd';

const originalCell = getCell(cursor.x, cursor.y);
const result = renderCursor(cursor, originalCell);

if (result.fullCell) {
  // Block cursor replaces entire cell
  setCell(cursor.x, cursor.y, result.cell);
} else {
  // Underline/bar overlays partial cell
  overlayCell(cursor.x, cursor.y, result.cell);
}
```

### createCursorCell

Create a cell for just the cursor character.

```typescript
import { createCursorCell } from 'blecsd';

const cursorCell = createCursorCell(cursor);
```

## Multi-Cursor Support

### CursorManager

Manage multiple cursors with a primary cursor.

```typescript
import {
  createCursorManager,
  getPrimaryCursor,
  addCursor,
  removeCursor,
  getVisibleCursors,
} from 'blecsd';

// Create manager
const manager = createCursorManager();

// Get primary cursor
const primary = getPrimaryCursor(manager);

// Add secondary cursor
const secondary = createArtificialCursor({ id: 'secondary', x: 20, y: 10 });
manager = addCursor(manager, secondary);

// Remove cursor (cannot remove primary)
manager = removeCursor(manager, 'secondary');

// Get all visible cursors for rendering
const visible = getVisibleCursors(manager);
```

### updateAllCursorBlinks

Update blink state for all cursors in manager.

```typescript
import { updateAllCursorBlinks } from 'blecsd';

manager = updateAllCursorBlinks(manager, performance.now());
```

### getCursorAt

Get cursor at a specific position.

```typescript
import { getCursorAt } from 'blecsd';

const cursor = getCursorAt(manager, 10, 5);
if (cursor) {
  // There's a cursor here
}
```

## Terminal Integration

### Hiding Terminal Cursor

When using artificial cursors, hide the terminal's native cursor.

```typescript
import { hideTerminalCursor, showTerminalCursor } from 'blecsd';

// Enter artificial cursor mode
process.stdout.write(hideTerminalCursor());

// ... game loop with artificial cursor ...

// Exit artificial cursor mode
process.stdout.write(showTerminalCursor());
```

### Constants

```typescript
import {
  HIDE_TERMINAL_CURSOR,  // '\x1b[?25l'
  SHOW_TERMINAL_CURSOR,  // '\x1b[?25h'
  BLOCK_CURSOR_CHAR,     // '\u2588' (full block)
  UNDERLINE_CURSOR_CHAR, // '\u2581' (lower one eighth)
  BAR_CURSOR_CHAR,       // '\u258F' (left one eighth)
} from 'blecsd';
```

## Example: Text Editor Cursor

```typescript
import {
  createArtificialCursor,
  moveCursorTo,
  updateCursorBlink,
  resetCursorBlink,
  isCursorVisible,
  renderCursor,
  hideTerminalCursor,
  showTerminalCursor,
} from 'blecsd';

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

  // Clear previous cursor position if needed
  // ...

  if (isCursorVisible(cursor)) {
    const cell = renderCursor(cursor, buffer.getCell(cursor.x, cursor.y));
    buffer.setCell(cursor.x, cursor.y, cell.cell);
  }

  // Output to terminal
  // ...
}

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
