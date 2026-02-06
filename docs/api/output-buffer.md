# Output Buffer

The OutputBuffer class provides efficient buffered output for terminal rendering, coalescing multiple writes into a single flush for better performance.

## Overview

OutputBuffer accumulates write operations and flushes them in a single operation, reducing system calls and improving rendering performance. It also tracks cursor position through escape sequences for accurate positioning.

**Note:** This module is internal and not exported from the main package. It is used internally by the Program class.

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import { OutputBuffer } from 'blecsd/terminal';

const buffer = new OutputBuffer();

// Accumulate writes
buffer.write('Hello ');
buffer.write('World!');
buffer.writeln('');

// Flush all at once
buffer.flush(process.stdout);
```

## Constructor

```typescript
new OutputBuffer(options?: OutputBufferOptions)
```

### OutputBufferOptions

```typescript
interface OutputBufferOptions {
  /** Auto-flush on setImmediate (default: false) */
  autoFlush?: boolean;
  /** Track cursor position through writes (default: true) */
  trackCursor?: boolean;
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `cursorX` | `number` | Current cursor X position (1-indexed column) |
| `cursorY` | `number` | Current cursor Y position (1-indexed row) |
| `cursorPosition` | `CursorPosition` | Current cursor position object |
| `length` | `number` | Current buffer length in characters |
| `chunkCount` | `number` | Number of chunks in the buffer |
| `isEmpty` | `boolean` | Whether the buffer is empty |

### CursorPosition

```typescript
interface CursorPosition {
  x: number;
  y: number;
}
```

## Methods

### write()

Write data to the buffer.

```typescript
write(data: string): void
```

**Example:**

```typescript
buffer.write('Hello');
buffer.write(style.fg('red'));
buffer.write('Red text');
```

### writeln()

Write data followed by a newline.

```typescript
writeln(data: string): void
```

**Example:**

```typescript
buffer.writeln('Line 1');
buffer.writeln('Line 2');
```

### writeAt()

Move cursor to position and write data.

```typescript
writeAt(x: number, y: number, data: string): void
```

**Parameters:**
- `x` - Column (1-indexed)
- `y` - Row (1-indexed)
- `data` - String data to write

**Example:**

```typescript
buffer.writeAt(10, 5, 'Hello at position 10, 5');
```

### flush()

Flush buffer contents to the output stream.

```typescript
flush(stream: Writable): void
```

**Example:**

```typescript
buffer.write('Accumulated content');
buffer.flush(process.stdout);
```

### setAutoFlushTarget()

Set the auto-flush target stream. When autoFlush is enabled, writes will be batched and flushed on setImmediate.

```typescript
setAutoFlushTarget(stream: Writable | null): void
```

**Example:**

```typescript
const buffer = new OutputBuffer({ autoFlush: true });
buffer.setAutoFlushTarget(process.stdout);

// Writes are automatically batched and flushed
buffer.write('This will auto-flush');
```

### clear()

Clear the buffer without flushing.

```typescript
clear(): void
```

**Example:**

```typescript
buffer.write('This will be discarded');
buffer.clear();
// Buffer is now empty
```

### getContents()

Get the current buffer contents without flushing.

```typescript
getContents(): string
```

**Returns:** Current buffer contents as a single string

**Example:**

```typescript
buffer.write('Hello');
buffer.write(' World');
console.log(buffer.getContents()); // "Hello World"
```

### resetCursor()

Reset cursor position tracking.

```typescript
resetCursor(x?: number, y?: number): void
```

**Parameters:**
- `x` - Initial X position (default: 1)
- `y` - Initial Y position (default: 1)

**Example:**

```typescript
buffer.resetCursor(1, 1);  // Reset to home position
buffer.resetCursor(10, 5); // Reset to specific position
```

## Cursor Tracking

OutputBuffer automatically tracks cursor position by parsing:

- **Cursor movement sequences**: `CSI A`, `CSI B`, `CSI C`, `CSI D`, `CSI H`, etc.
- **Control characters**: newline (`\n`), carriage return (`\r`), tab (`\t`), backspace (`\b`)
- **Printable characters**: Any character that advances the cursor

This enables accurate cursor positioning without querying the terminal.

**Example:**

```typescript
const buffer = new OutputBuffer();

buffer.write('Hello');
console.log(buffer.cursorX); // 6

buffer.write('\n');
console.log(buffer.cursorX); // 1
console.log(buffer.cursorY); // 2

buffer.write(cursor.move(10, 5));
console.log(buffer.cursorX); // 10
console.log(buffer.cursorY); // 5
```

## Usage Patterns

### Game Rendering

<!-- blecsd-doccheck:ignore -->
```typescript
import { OutputBuffer, cursor, style, screen } from 'blecsd/terminal';

class GameRenderer {
  private buffer = new OutputBuffer();

  render(gameState: GameState) {
    // Clear screen
    this.buffer.write(screen.clear());

    // Draw game objects
    for (const entity of gameState.entities) {
      this.buffer.writeAt(entity.x, entity.y, entity.char);
    }

    // Draw UI
    this.buffer.writeAt(1, 1, `Score: ${gameState.score}`);

    // Single flush for entire frame
    this.buffer.flush(process.stdout);
  }
}
```

### Batched Updates with Auto-Flush

```typescript
const buffer = new OutputBuffer({ autoFlush: true });
buffer.setAutoFlushTarget(process.stdout);

// Multiple writes are batched within the same tick
buffer.write('Line 1\n');
buffer.write('Line 2\n');
buffer.write('Line 3\n');

// All three writes are flushed together on setImmediate
```

### Styled Output

<!-- blecsd-doccheck:ignore -->
```typescript
import { OutputBuffer, style } from 'blecsd/terminal';

const buffer = new OutputBuffer();

buffer.write(style.bold());
buffer.write(style.fg('red'));
buffer.write('Error: ');
buffer.write(style.reset());
buffer.writeln('Something went wrong');

buffer.flush(process.stdout);
```

## Performance Considerations

- **Minimize flushes**: Accumulate all frame content before flushing once
- **Disable cursor tracking**: If not needed, set `trackCursor: false` to skip escape sequence parsing
- **Use auto-flush**: For event-driven updates, auto-flush batches writes efficiently

## Related

- [Program](./program.md) - High-level terminal control (uses OutputBuffer internally)
- [ANSI Escape Codes](./ansi.md) - Escape sequence generation
- [Synchronized Output](./sync-output.md) - Flicker-free rendering
