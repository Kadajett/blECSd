# Optimized Output

High-performance output buffering with escape sequence optimization. Batches terminal output and removes redundant escape sequences for efficient rendering.

Key optimizations:
- Single `write()` call per frame
- Cursor position tracking to skip unnecessary moves
- Color state deduplication
- Escape sequence coalescing
- Synchronized output support

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createOutputBuffer,
  writeCellAt,
  writeStringAt,
  flushToStream,
  getOutputStats,
  beginFrame,
  endFrame,
  DEFAULT_COLOR,
} from 'blecsd';

const buffer = createOutputBuffer({ syncMode: true, trackStats: true });

// Begin synchronized frame
beginFrame(buffer);

// Write cells with automatic optimization
writeCellAt(buffer, 0, 0, 'H', 0xff0000, 0x000000);
writeCellAt(buffer, 1, 0, 'i', 0xff0000, 0x000000); // Same colors: no color reset emitted

// Write a string
writeStringAt(buffer, 0, 1, 'Hello World', 0x00ff00, DEFAULT_COLOR);

// End frame and flush
endFrame(buffer);
flushToStream(buffer, process.stdout);

// Check optimization stats
const stats = getOutputStats(buffer);
console.log(`Saved ${stats.bytesSaved} bytes via optimization`);
```

## Types

### OutputBufferOptions

```typescript
interface OutputBufferOptions {
  readonly initialCapacity?: number;  // Initial buffer capacity (default: 8192)
  readonly syncMode?: boolean;        // Enable synchronized output (default: true)
  readonly trackStats?: boolean;      // Track statistics (default: false)
}
```

### ColorState

```typescript
interface ColorState {
  fg: number;     // Current foreground (24-bit RGB or -1 for default)
  bg: number;     // Current background (24-bit RGB or -1 for default)
  attrs: number;  // Current text attributes
}
```

### OutputStats

```typescript
interface OutputStats {
  cellsWritten: number;
  cursorMoves: number;
  cursorMovesSkipped: number;
  colorChanges: number;
  colorChangesSkipped: number;
  bytesWritten: number;
  bytesSaved: number;
}
```

### OutputBufferData

The output buffer state object. Created by `createOutputBuffer`.

### Text Attribute Flags

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  ATTR_BOLD,
  ATTR_DIM,
  ATTR_ITALIC,
  ATTR_UNDERLINE,
  ATTR_BLINK,
  ATTR_INVERSE,
  ATTR_HIDDEN,
  ATTR_STRIKETHROUGH,
  DEFAULT_COLOR,
} from 'blecsd';

// Combine attributes with bitwise OR
const attrs = ATTR_BOLD | ATTR_UNDERLINE;
```

| Constant | Value | Description |
|----------|-------|-------------|
| `ATTR_BOLD` | `1` | Bold text |
| `ATTR_DIM` | `2` | Dim text |
| `ATTR_ITALIC` | `4` | Italic text |
| `ATTR_UNDERLINE` | `8` | Underlined text |
| `ATTR_BLINK` | `16` | Blinking text |
| `ATTR_INVERSE` | `32` | Inverse colors |
| `ATTR_HIDDEN` | `64` | Hidden text |
| `ATTR_STRIKETHROUGH` | `128` | Strikethrough text |
| `DEFAULT_COLOR` | `-1` | Reset to default color |

## Functions

### Buffer Creation

#### createOutputBuffer

Creates a new optimized output buffer.

```typescript
function createOutputBuffer(options?: OutputBufferOptions): OutputBufferData
```

#### setScreenSize

Sets the screen dimensions for line wrap calculations.

```typescript
function setScreenSize(buffer: OutputBufferData, width: number, height: number): void
```

### Writing

#### writeCellAt

Writes a character at a specific position with colors and attributes. Combines cursor movement and character output with optimization.

```typescript
function writeCellAt(
  buffer: OutputBufferData,
  x: number, y: number,
  char: string,
  fg?: number, bg?: number, attrs?: number,
): void
```

#### writeStringAt

Writes a string at a specific position.

```typescript
function writeStringAt(
  buffer: OutputBufferData,
  x: number, y: number,
  text: string,
  fg?: number, bg?: number, attrs?: number,
): void
```

#### writeChar

Writes a character at the current cursor position.

```typescript
function writeChar(buffer: OutputBufferData, char: string): void
```

#### writeRaw

Writes raw content to the buffer without optimization. Use sparingly for special escape sequences.

```typescript
function writeRaw(buffer: OutputBufferData, content: string): void
```

### Cursor

#### moveCursor

Moves cursor to position, skipping if already there. Uses optimized single-axis moves when possible.

```typescript
function moveCursor(buffer: OutputBufferData, x: number, y: number): void
```

#### hideCursor / showCursor

```typescript
function hideCursor(buffer: OutputBufferData): void
function showCursor(buffer: OutputBufferData): void
```

### Color and Attributes

#### setForeground / setBackground

Sets foreground or background color, skipping if already set.

```typescript
function setForeground(buffer: OutputBufferData, color: number): void
function setBackground(buffer: OutputBufferData, color: number): void
```

#### setAttributes

Sets text attributes, only changing what differs.

```typescript
function setAttributes(buffer: OutputBufferData, attrs: number): void
```

#### resetColorState

Resets the color state to defaults.

```typescript
function resetColorState(buffer: OutputBufferData): void
```

### Frame Management

#### beginFrame / endFrame

Begins or ends a synchronized output frame.

```typescript
function beginFrame(buffer: OutputBufferData): void
function endFrame(buffer: OutputBufferData): void
```

### Clearing

```typescript
function clearScreen(buffer: OutputBufferData): void
function clearToEnd(buffer: OutputBufferData): void
function clearLine(buffer: OutputBufferData): void
```

### Flushing and Reset

#### flushToStream

Flushes the buffer to a writable stream as a single `write()` call.

```typescript
function flushToStream(buffer: OutputBufferData, stream: Writable): void
```

#### clearBuffer

Clears the buffer without flushing.

```typescript
function clearBuffer(buffer: OutputBufferData): void
```

#### resetBuffer

Resets the buffer state completely (chunks, cursor position, color state).

```typescript
function resetBuffer(buffer: OutputBufferData): void
```

### Statistics

#### getOutputStats

Gets current buffer statistics.

```typescript
function getOutputStats(buffer: OutputBufferData): Readonly<OutputStats>
```

#### resetStats

Resets buffer statistics.

```typescript
function resetStats(buffer: OutputBufferData): void
```

#### estimateBytesSaved

Estimates bytes saved by optimization.

```typescript
function estimateBytesSaved(buffer: OutputBufferData): number
```

#### getContents / getBufferLength

```typescript
function getContents(buffer: OutputBufferData): string
function getBufferLength(buffer: OutputBufferData): number
```

## See Also

- [GPU Probe](./gpu-probe.md) - Detecting GPU-accelerated terminals
- [Colors](./colors.md) - Color system for terminal rendering
