# Box Rendering Utilities

Low-level utilities for drawing boxes, borders, and text to cell buffers. These utilities work with any object implementing the `CellBuffer` interface.

## CellBuffer Interface

```typescript
interface CellBuffer {
  readonly width: number;
  readonly height: number;
  setCell(x: number, y: number, char: string, fg?: number, bg?: number): void;
}
```

Any object implementing this interface can be used with the rendering functions.

## Box Character Presets

Pre-defined character sets for drawing boxes.

| Preset | Characters | Example |
|--------|------------|---------|
| `BOX_SINGLE` | `┌─┐│└┘` | Standard single-line box |
| `BOX_DOUBLE` | `╔═╗║╚╝` | Double-line box |
| `BOX_ROUNDED` | `╭─╮│╰╯` | Rounded corners |
| `BOX_BOLD` | `┏━┓┃┗┛` | Bold/thick lines |
| `BOX_ASCII` | `+-+\|` | ASCII-only (all terminals) |
| `BOX_DASHED` | `┌╌┐╎└┘` | Dashed lines |

### BoxChars Type

```typescript
interface BoxChars {
  readonly topLeft: string;
  readonly topRight: string;
  readonly bottomLeft: string;
  readonly bottomRight: string;
  readonly horizontal: string;
  readonly vertical: string;
}
```

## Functions

### createCellBuffer

Creates a simple in-memory cell buffer for testing and rendering.

```typescript
function createCellBuffer(
  width: number,
  height: number,
  defaultFg?: number,  // Default: 0xffffffff (white)
  defaultBg?: number   // Default: 0x00000000 (transparent)
): CellBuffer & { cells: Cell[][] }
```

**Example:**

```typescript
import { createCellBuffer, renderBox, BOX_SINGLE } from 'blecsd';

const buffer = createCellBuffer(80, 24);
renderBox(buffer, 5, 2, 20, 10, BOX_SINGLE);
```

### renderBox

Renders a box with borders to a cell buffer.

```typescript
function renderBox(
  buffer: CellBuffer,
  x: number,       // Left column (0-indexed)
  y: number,       // Top row (0-indexed)
  width: number,   // Box width (including borders)
  height: number,  // Box height (including borders)
  chars: BoxChars, // Box character set
  options?: RenderBoxOptions
): void
```

**Options:**

```typescript
interface RenderBoxOptions {
  fg?: number;        // Foreground color for border
  bg?: number;        // Background color for border
  fill?: boolean;     // Fill interior (default: false)
  fillChar?: string;  // Fill character (default: ' ')
}
```

**Example:**

```typescript
import { createCellBuffer, renderBox, BOX_ROUNDED, BOX_DOUBLE } from 'blecsd';

const buffer = createCellBuffer(80, 24);

// Simple box
renderBox(buffer, 0, 0, 20, 10, BOX_ROUNDED);

// Filled box with colors
renderBox(buffer, 25, 0, 20, 10, BOX_DOUBLE, {
  fg: 0x00ff00ff,  // Green border
  bg: 0x0000aaff,  // Blue background
  fill: true
});

// Box with custom fill character
renderBox(buffer, 50, 0, 20, 10, BOX_SINGLE, {
  fill: true,
  fillChar: '.'
});
```

### renderHLine

Renders a horizontal line.

```typescript
function renderHLine(
  buffer: CellBuffer,
  x: number,      // Starting column
  y: number,      // Row
  length: number, // Line length
  char?: string,  // Character (default: '─')
  fg?: number,    // Foreground color
  bg?: number     // Background color
): void
```

**Example:**

```typescript
import { createCellBuffer, renderHLine, BOX_DOUBLE } from 'blecsd';

const buffer = createCellBuffer(80, 24);
renderHLine(buffer, 5, 10, 20, BOX_DOUBLE.horizontal);
```

### renderVLine

Renders a vertical line.

```typescript
function renderVLine(
  buffer: CellBuffer,
  x: number,      // Column
  y: number,      // Starting row
  length: number, // Line length
  char?: string,  // Character (default: '│')
  fg?: number,    // Foreground color
  bg?: number     // Background color
): void
```

**Example:**

```typescript
import { createCellBuffer, renderVLine, BOX_BOLD } from 'blecsd';

const buffer = createCellBuffer(80, 24);
renderVLine(buffer, 10, 5, 15, BOX_BOLD.vertical);
```

### fillRect

Fills a rectangular region with a character.

```typescript
function fillRect(
  buffer: CellBuffer,
  x: number,      // Left column
  y: number,      // Top row
  width: number,  // Region width
  height: number, // Region height
  char?: string,  // Fill character (default: ' ')
  fg?: number,    // Foreground color
  bg?: number     // Background color
): void
```

**Example:**

```typescript
import { createCellBuffer, fillRect } from 'blecsd';

const buffer = createCellBuffer(80, 24);

// Clear a region
fillRect(buffer, 5, 5, 20, 10, ' ');

// Fill with background color
fillRect(buffer, 30, 5, 20, 10, ' ', 0xffffffff, 0x0000aaff);
```

### renderText

Renders text to a cell buffer.

```typescript
function renderText(
  buffer: CellBuffer,
  x: number,    // Starting column
  y: number,    // Row
  text: string, // Text to render
  fg?: number,  // Foreground color
  bg?: number   // Background color
): void
```

**Example:**

```typescript
import { createCellBuffer, renderBox, renderText, BOX_ROUNDED } from 'blecsd';

const buffer = createCellBuffer(80, 24);

// Draw a titled box
renderBox(buffer, 0, 0, 30, 10, BOX_ROUNDED, { fill: true });
renderText(buffer, 2, 2, 'Hello, World!', 0x00ff00ff);
```

### bufferToString

Converts a cell buffer to a string (useful for testing and debugging).

```typescript
function bufferToString(
  buffer: CellBuffer & { cells: Cell[][] }
): string
```

**Example:**

```typescript
import { createCellBuffer, renderBox, BOX_SINGLE, bufferToString } from 'blecsd';

const buffer = createCellBuffer(10, 5);
renderBox(buffer, 0, 0, 10, 5, BOX_SINGLE);

console.log(bufferToString(buffer));
// Output:
// ┌────────┐
// │        │
// │        │
// │        │
// └────────┘
```

### charsetToBoxChars

Converts a BorderCharset (code points) to BoxChars (strings).

```typescript
function charsetToBoxChars(charset: BorderCharset): BoxChars
```

**Example:**

```typescript
import { BORDER_ROUNDED, charsetToBoxChars } from 'blecsd';

const chars = charsetToBoxChars(BORDER_ROUNDED);
console.log(chars.topLeft); // "╭"
```

## Integration Examples

### Nested Boxes

```typescript
import { createCellBuffer, renderBox, BOX_DOUBLE, BOX_SINGLE, bufferToString } from 'blecsd';

const buffer = createCellBuffer(20, 10);

// Outer box with double lines
renderBox(buffer, 0, 0, 20, 10, BOX_DOUBLE);

// Inner box with single lines
renderBox(buffer, 2, 1, 16, 8, BOX_SINGLE);

console.log(bufferToString(buffer));
```

### Dialog Box with Title

```typescript
import { createCellBuffer, renderBox, renderText, BOX_ROUNDED, bufferToString } from 'blecsd';

const buffer = createCellBuffer(40, 12);

// Main dialog box
renderBox(buffer, 0, 0, 40, 12, BOX_ROUNDED, { fill: true });

// Title
renderText(buffer, 2, 0, ' Confirm ');

// Content
renderText(buffer, 2, 3, 'Are you sure you want to proceed?');
renderText(buffer, 2, 5, 'This action cannot be undone.');

// Buttons
renderBox(buffer, 8, 8, 10, 3, BOX_ROUNDED);
renderText(buffer, 11, 9, 'Yes');

renderBox(buffer, 22, 8, 10, 3, BOX_ROUNDED);
renderText(buffer, 25, 9, 'No');

console.log(bufferToString(buffer));
```

## Color Format

Colors are 32-bit RGBA values in the format `0xRRGGBBAA`:

- `0xff0000ff` - Red (fully opaque)
- `0x00ff00ff` - Green (fully opaque)
- `0x0000ffff` - Blue (fully opaque)
- `0xffffffff` - White (fully opaque)
- `0x00000000` - Transparent black

## Related

- [Border Component](../border.md) - Higher-level border component for entities
- [Renderable Component](../renderable.md) - Entity rendering with dirty tracking
