# Program Class

The Program class is the main terminal control interface, managing input/output streams, terminal dimensions, cursor position, and event handling.

## Overview

Program provides a high-level API for terminal applications:
- Input/output stream management
- Terminal initialization and cleanup
- Event handling (key, mouse, resize)
- Output buffering for efficient rendering

## Quick Start

```typescript
import { createProgram } from 'blecsd/terminal';

const program = createProgram({
  useAlternateScreen: true,
  hideCursor: true,
  title: 'My Application',
});

program.on('key', (event) => {
  if (event.name === 'q') {
    program.destroy();
  }
});

program.on('resize', ({ cols, rows }) => {
  // Handle terminal resize
});
```

## Factory Function

```typescript
createProgram(config?: ProgramConfig): Program
```

### ProgramConfig

```typescript
interface ProgramConfig {
  /** Input stream (default: process.stdin) */
  input?: Readable;
  /** Output stream (default: process.stdout) */
  output?: Writable;
  /** Use alternate screen buffer (default: true) */
  useAlternateScreen?: boolean;
  /** Hide cursor on init (default: true) */
  hideCursor?: boolean;
  /** Terminal title */
  title?: string;
  /** Force specific terminal width (for testing) */
  forceWidth?: number;
  /** Force specific terminal height (for testing) */
  forceHeight?: number;
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `cols` | `number` | Terminal width in columns |
| `rows` | `number` | Terminal height in rows |
| `output` | `Writable` | Output stream |
| `input` | `Readable` | Input stream |

## Methods

### Lifecycle

#### init()

Initialize the program and terminal.

```typescript
async init(): Promise<void>
```

Sets up:
- Raw mode on input
- Alternate screen buffer (if enabled)
- Cursor visibility
- Signal handlers
- Event listeners

**Example:**

```typescript
import { createProgram } from 'blecsd/terminal';
const program = createProgram();
// Program is now ready
```

#### destroy()

Destroy the program and restore terminal.

```typescript
destroy(): void
```

Cleans up:
- Restores normal screen buffer
- Shows cursor
- Resets styles
- Unregisters signal handlers

**Example:**

```typescript
import { createProgram } from 'blecsd/terminal';
const program = createProgram();
program.on('key', (event) => {
  if (event.name === 'q' || (event.ctrl && event.name === 'c')) {
    program.destroy();
    process.exit(0);
  }
});
```

### Output

#### write()

Write text through the output buffer.

```typescript
write(data: string): void
```

Text is buffered and written on the next flush or tick.

**Example:**

```typescript
import { createProgram } from 'blecsd/terminal';
const program = createProgram();
program.write('Hello, ');
program.write('World!');
program.flush();  // Writes "Hello, World!"
```

#### rawWrite()

Write directly to output, bypassing the buffer.

```typescript
rawWrite(data: string): void
```

Use for escape sequences that need immediate effect.

#### flush()

Flush the output buffer.

```typescript
flush(): void
```

Writes all buffered content to the output stream.

### Screen Control

#### clear()

Clear the screen and move cursor to home.

```typescript
clear(): void
```

#### move()

Move cursor to position.

```typescript
move(x: number, y: number): void
```

**Parameters:**
- `x` - Column (1-indexed)
- `y` - Row (1-indexed)

**Example:**

```typescript
import { createProgram } from 'blecsd/terminal';
const program = createProgram();
program.move(10, 5);
program.write('Text at 10, 5');
```

#### cursorTo()

Alias for `move()`.

```typescript
cursorTo(x: number, y: number): void
```

#### showCursor()

Make the cursor visible.

```typescript
showCursor(): void
```

#### hideCursor()

Hide the cursor.

```typescript
hideCursor(): void
```

### Styling

#### setTitle()

Set the terminal window title.

```typescript
setTitle(title: string): void
```

#### resetStyle()

Reset all text styles.

```typescript
resetStyle(): void
```

## Events

### key

Emitted when a key is pressed.

```typescript
import { createProgram } from 'blecsd/terminal';
import type { KeyEvent } from 'blecsd/terminal';
const program = createProgram();
program.on('key', (event: KeyEvent) => {
  console.log('Key:', event.name);
  console.log('Ctrl:', event.ctrl);
  console.log('Meta:', event.meta);
  console.log('Shift:', event.shift);
});
```

#### KeyEvent

```typescript
interface KeyEvent {
  /** Key name or character */
  name: string;
  /** Raw key sequence */
  sequence: string;
  /** Ctrl key pressed */
  ctrl: boolean;
  /** Meta/Alt key pressed */
  meta: boolean;
  /** Shift key pressed */
  shift: boolean;
}
```

### mouse

Emitted when a mouse event occurs (if mouse tracking enabled).

```typescript
import { createProgram } from 'blecsd/terminal';
import type { ParsedMouseEvent as MouseEvent } from 'blecsd/terminal';
const program = createProgram();
program.on('mouse', (event: MouseEvent) => {
  console.log(`Mouse ${event.action} at ${event.x}, ${event.y}`);
});
```

#### MouseEvent

```typescript
interface MouseEvent {
  /** Mouse X position (1-indexed) */
  x: number;
  /** Mouse Y position (1-indexed) */
  y: number;
  /** Mouse button (0=left, 1=middle, 2=right) */
  button: number;
  /** Event action */
  action: 'mousedown' | 'mouseup' | 'mousemove' | 'wheel';
  /** Ctrl key pressed */
  ctrl: boolean;
  /** Meta/Alt key pressed */
  meta: boolean;
  /** Shift key pressed */
  shift: boolean;
}
```

### resize

Emitted when the terminal is resized.

```typescript
import { createProgram } from 'blecsd/terminal';
const program = createProgram();
program.on('resize', (event: { cols: number; rows: number }) => {
  console.log(`New size: ${event.cols}x${event.rows}`);
  // Re-render application
});
```

#### ResizeEvent

```typescript
interface ResizeEvent {
  /** New width in columns */
  cols: number;
  /** New height in rows */
  rows: number;
}
```

### focus / blur

Emitted when the terminal gains or loses focus.

```typescript
import { createProgram } from 'blecsd/terminal';
const program = createProgram();
program.on('focus', () => {
  // Terminal gained focus
});

program.on('blur', () => {
  // Terminal lost focus
});
```

## Usage Patterns

### Basic Application

```typescript
import { createProgram } from 'blecsd/terminal';

const program = createProgram({
  title: 'My App',
  useAlternateScreen: true,
});

program.clear();
program.move(1, 1);
program.write('Press Q to quit');

program.on('key', (event) => {
  if (event.name === 'q') {
    program.destroy();
    process.exit(0);
  }
});

program.on('resize', () => {
  program.clear();
  program.move(1, 1);
  program.write(`Size: ${program.cols}x${program.rows}`);
});
```

### Game Loop

```typescript
import { createProgram } from 'blecsd/terminal';
import type { KeyEvent } from 'blecsd/terminal';

const program = createProgram();
let running = true;

const render = (): void => {
  program.clear();
  // Draw game state...
  program.flush();
};

const handleKey = (event: KeyEvent): void => {
  if (event.name === 'q') {
    running = false;
    program.destroy();
  }
};

// In production, call render in your game loop at ~60fps
// Example: setInterval(render, 16)
console.log('Game loop running:', running);

program.on('key', handleKey);
program.on('resize', render);
```

## Schema Validation

The config is validated using Zod:

```typescript
import { createProgram, ProgramConfigSchema } from 'blecsd/terminal';

// Validate custom config
const result = ProgramConfigSchema.safeParse({
  useAlternateScreen: true,
  hideCursor: true,
  forceWidth: 80,
  forceHeight: 24,
});

if (result.success) {
  const program = createProgram(result.data);
}
```

## Related

- [ANSI Escape Codes](./ansi.md) - Low-level escape sequences
- Output Buffer - Output buffering
- [Cleanup](./cleanup.md) - Terminal cleanup handling
