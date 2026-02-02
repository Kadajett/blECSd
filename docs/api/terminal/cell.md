# Cell Type and Screen Buffer

The cell module provides the fundamental `Cell` type for terminal rendering and a functional screen buffer implementation for managing a grid of cells.

## Overview

Every terminal display is composed of a grid of cells. Each cell contains:
- A character (Unicode-aware, including emoji)
- Foreground color (packed 32-bit RGBA)
- Background color (packed 32-bit RGBA)
- Text attributes (bold, underline, etc.)

The screen buffer provides efficient storage and manipulation of these cells.

## Cell Type

### Creating Cells

```typescript
import { createCell, Attr, DEFAULT_FG, DEFAULT_BG } from 'blecsd';

// Default empty cell (space with white on black)
const empty = createCell();

// Red 'X' on black background
const redX = createCell('X', 0xff0000ff, 0x000000ff);

// Bold white 'A' on blue background
const boldA = createCell('A', 0xffffffff, 0x0000ffff, Attr.BOLD);

// Unicode characters work correctly
const block = createCell('\u2588'); // Full block
const emoji = createCell('\u{1F600}'); // Grinning face
```

### Cell Interface

```typescript
interface Cell {
  char: string;      // Character (may be multi-byte)
  fg: number;        // Foreground color (packed RGBA)
  bg: number;        // Background color (packed RGBA)
  attrs: AttrFlags;  // Packed attribute flags
}
```

### Text Attributes

Attributes can be combined using bitwise OR:

```typescript
import { Attr } from 'blecsd';

// Available attributes
Attr.NONE          // No attributes (0)
Attr.BOLD          // Bold text
Attr.DIM           // Dim/faint text
Attr.ITALIC        // Italic text
Attr.UNDERLINE     // Underlined text
Attr.BLINK         // Blinking text
Attr.INVERSE       // Inverted colors
Attr.HIDDEN        // Hidden text
Attr.STRIKETHROUGH // Strikethrough text

// Combine attributes
const attrs = Attr.BOLD | Attr.UNDERLINE;

// Check if attribute is set
const isBold = (attrs & Attr.BOLD) !== 0;
```

### Cell Utilities

```typescript
import {
  cloneCell,
  cellsEqual,
  hasAttr,
  withAttr,
  withoutAttr,
} from 'blecsd';

const cell = createCell('X', 0xff0000ff, 0x000000ff, Attr.BOLD);

// Clone a cell
const copy = cloneCell(cell);

// Compare cells
if (cellsEqual(cell, copy)) {
  console.log('Cells are identical');
}

// Check for attribute
if (hasAttr(cell, Attr.BOLD)) {
  console.log('Cell is bold');
}

// Add attribute (returns new cell)
const underlined = withAttr(cell, Attr.UNDERLINE);

// Remove attribute (returns new cell)
const notBold = withoutAttr(cell, Attr.BOLD);
```

## Screen Buffer

### Creating a Buffer

```typescript
import { createScreenBuffer, createCell } from 'blecsd';

// Create an 80x24 buffer with default cells
const buffer = createScreenBuffer(80, 24);

// Create a buffer with custom default cell (blue background)
const blueBuffer = createScreenBuffer(80, 24, createCell(' ', 0xffffffff, 0x0000ffff));
```

### Buffer Interface

```typescript
interface ScreenBufferData {
  readonly width: number;   // Buffer width in cells
  readonly height: number;  // Buffer height in cells
  readonly cells: Cell[];   // Flat array (row-major order)
}
```

### Reading and Writing Cells

```typescript
import {
  getCell,
  setCell,
  setChar,
  isInBounds,
  cellIndex,
} from 'blecsd';

const buffer = createScreenBuffer(80, 24);

// Check bounds before access
if (isInBounds(buffer, 10, 5)) {
  // Set a cell
  setCell(buffer, 10, 5, createCell('X', 0xff0000ff));

  // Read a cell
  const cell = getCell(buffer, 10, 5);
  console.log(cell?.char); // 'X'

  // Change only the character (preserves colors/attrs)
  setChar(buffer, 10, 5, 'Y');
}

// Get array index for direct access
const idx = cellIndex(buffer, 10, 5);
if (idx >= 0) {
  buffer.cells[idx] = createCell('Z');
}
```

### Buffer Operations

```typescript
import {
  clearBuffer,
  fillRect,
  writeString,
  copyRegion,
  resizeBuffer,
} from 'blecsd';

const buffer = createScreenBuffer(80, 24);

// Clear entire buffer
clearBuffer(buffer);

// Clear to a specific cell
clearBuffer(buffer, createCell(' ', 0xffffffff, 0x0000ffff));

// Fill a rectangular region
fillRect(buffer, 10, 5, 20, 5, createCell(' ', 0xffffffff, 0xff0000ff));

// Write a string
writeString(buffer, 0, 0, 'Hello, World!');

// Write with colors and attributes
writeString(buffer, 0, 1, 'Warning!', 0xff0000ff, 0x000000ff, Attr.BOLD);

// Copy region between buffers
const src = createScreenBuffer(80, 24);
const dst = createScreenBuffer(80, 24);
copyRegion(src, dst, 0, 0, 10, 10, 20, 20); // Copy 20x20 region

// Resize buffer (preserves content)
const larger = resizeBuffer(buffer, 120, 40);
```

### Buffer Diffing

For efficient terminal updates, compare buffers and only output changed cells:

```typescript
import { createScreenBuffer, setCell, createCell, diffBuffers } from 'blecsd';

// Previous frame
const oldBuffer = createScreenBuffer(80, 24);

// Current frame
const newBuffer = createScreenBuffer(80, 24);
setCell(newBuffer, 10, 5, createCell('X'));
setCell(newBuffer, 20, 10, createCell('Y'));

// Get only changed cells
const changes = diffBuffers(oldBuffer, newBuffer);

// Output only what changed
for (const { x, y, cell } of changes) {
  // Move cursor to (x, y) and output cell
  outputCell(x, y, cell);
}
```

## Color Encoding

Colors are packed as 32-bit RGBA values:

```typescript
// Pack color manually
const red = 0xff0000ff;  // AARRGGBB format

// Color constants
import { DEFAULT_FG, DEFAULT_BG } from 'blecsd';
// DEFAULT_FG = 0xffffffff (white)
// DEFAULT_BG = 0x000000ff (black)
```

For color utilities like `packColor`, `unpackColor`, `hexToColor`, see the [Renderable component](../renderable.md).

## Performance Considerations

- The screen buffer uses a flat array for cache-friendly access
- Cells are stored in row-major order: `index = y * width + x`
- Use `diffBuffers` to minimize terminal output
- Buffer operations mutate in-place for performance
- Use `cloneCell` when you need independent copies

## API Reference

### Cell Functions

| Function | Description |
|----------|-------------|
| `createCell(char?, fg?, bg?, attrs?)` | Create a new cell |
| `cloneCell(cell)` | Create a copy of a cell |
| `cellsEqual(a, b)` | Compare two cells for equality |
| `hasAttr(cell, attr)` | Check if cell has attribute |
| `withAttr(cell, attr)` | Add attribute to cell |
| `withoutAttr(cell, attr)` | Remove attribute from cell |

### Buffer Functions

| Function | Description |
|----------|-------------|
| `createScreenBuffer(width, height, defaultCell?)` | Create new buffer |
| `getCell(buffer, x, y)` | Get cell at position |
| `setCell(buffer, x, y, cell)` | Set cell at position |
| `setChar(buffer, x, y, char)` | Set character only |
| `clearBuffer(buffer, clearCell?)` | Clear entire buffer |
| `fillRect(buffer, x, y, w, h, cell)` | Fill rectangular region |
| `writeString(buffer, x, y, text, fg?, bg?, attrs?)` | Write string |
| `copyRegion(src, dst, srcX, srcY, dstX, dstY, w, h)` | Copy region |
| `resizeBuffer(buffer, newWidth, newHeight, fillCell?)` | Resize buffer |
| `diffBuffers(oldBuffer, newBuffer)` | Get changed cells |
| `isInBounds(buffer, x, y)` | Check if coordinates valid |
| `cellIndex(buffer, x, y)` | Get array index for position |
