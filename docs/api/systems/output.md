# Output System

The output system writes rendered content to the terminal. It runs in the POST_RENDER phase after all rendering is complete and generates optimized ANSI escape sequences for efficient terminal output.

## Overview

The output system:
- Reads minimal updates from the double buffer
- Generates optimized ANSI escape sequences
- Writes to the configured output stream
- Swaps buffers and clears dirty regions

## Basic Usage

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createScheduler,
  LoopPhase,
  outputSystem,
  setOutputStream,
  setOutputBuffer,
  createDoubleBuffer,
} from 'blecsd';

// Create double buffer for rendering
const db = createDoubleBuffer(80, 24);

// Set output stream and buffer
setOutputStream(process.stdout);
setOutputBuffer(db);

// Register with scheduler
const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.POST_RENDER, outputSystem);

// In game loop
scheduler.run(world, deltaTime);
```

## Setting Up Output

Before the output system can work, you must configure both the output stream and buffer:

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  setOutputStream,
  getOutputStream,
  clearOutputStream,
  setOutputBuffer,
  getOutputBuffer,
  clearOutputBuffer,
} from 'blecsd';

// Set output stream (typically process.stdout)
setOutputStream(process.stdout);

// Set double buffer (same one used by render system)
setOutputBuffer(db);

// Get current settings
const stream = getOutputStream(); // Returns Writable or null
const buffer = getOutputBuffer(); // Returns DoubleBufferData or null

// Clear when done
clearOutputStream();
clearOutputBuffer();
```

## Output State

The output system maintains state across frames for optimization:

```typescript
import type { OutputState } from 'blecsd';
import { createOutputState, getOutputState, resetOutputState } from 'blecsd';

// Create fresh state
const state = createOutputState();
// state.lastX = -1
// state.lastY = -1
// state.lastFg = -1
// state.lastBg = -1
// state.lastAttrs = -1
// state.alternateScreen = false

// Get global state (creates if needed)
const globalState = getOutputState();

// Reset global state
resetOutputState();
```

## Generating Output

The `generateOutput` function converts cell changes to ANSI sequences:

<!-- blecsd-doccheck:ignore -->
```typescript
import { generateOutput, createOutputState } from 'blecsd';
import type { CellChange } from 'blecsd';
import { createCell } from 'blecsd';

const state = createOutputState();
const changes: CellChange[] = [
  { x: 10, y: 5, cell: createCell('H', 0xffffffff, 0xff000000) },
  { x: 11, y: 5, cell: createCell('i', 0xffffffff, 0xff000000) },
];

const output = generateOutput(state, changes);
process.stdout.write(output);
```

### Output Optimizations

The system optimizes output in several ways:

1. **Cursor movement** - Skips moves for adjacent cells
2. **Color reuse** - Only emits color codes when colors change
3. **Attribute tracking** - Only emits attribute codes when needed
4. **Sorting** - Processes cells row by row for minimal cursor moves

## Screen Control

### Cursor Control

```typescript
import { hideCursor, showCursor, cursorHome } from 'blecsd';

// Hide cursor during rendering
hideCursor();

// Show cursor when done
showCursor();

// Move cursor to home position (0, 0)
cursorHome();
```

### Alternate Screen

Use alternate screen to preserve the terminal content:

```typescript
import { enterAlternateScreen, leaveAlternateScreen } from 'blecsd';

// Enter alternate screen (preserves main screen)
enterAlternateScreen();

// ... run application ...

// Leave alternate screen (restores main screen)
leaveAlternateScreen();
```

### Screen Clearing

```typescript
import { clearScreen, resetAttributes } from 'blecsd';

// Clear entire screen
clearScreen();

// Reset all terminal attributes to defaults
resetAttributes();
```

## Writing Raw Output

For custom ANSI sequences, use `writeRaw`:

```typescript
import { writeRaw } from 'blecsd';

// Write custom escape sequence
writeRaw('\x1b[2J'); // Clear screen
writeRaw('\x1b[?25l'); // Hide cursor
```

## Cleanup

Always clean up before exiting:

```typescript
import { cleanup } from 'blecsd';

// Cleanup restores terminal state:
// - Leaves alternate screen if active
// - Resets attributes
// - Shows cursor
// - Moves cursor to home
cleanup();
```

## Complete Example

```typescript
import {
  createWorld,
  addEntity,
  setPosition,
  setDimensions,
  setStyle,
  layoutSystem,
  renderSystem,
  outputSystem,
  setRenderBuffer,
  setOutputStream,
  setOutputBuffer,
  createDoubleBuffer,
  enterAlternateScreen,
  hideCursor,
  cleanup,
} from 'blecsd';

// Setup
const world = createWorld();
const db = createDoubleBuffer(80, 24);
setRenderBuffer(db);
setOutputStream(process.stdout);
setOutputBuffer(db);

// Initialize terminal
enterAlternateScreen();
hideCursor();

// Create entity
const panel = addEntity(world);
setPosition(world, panel, 10, 5);
setDimensions(world, panel, 30, 10);
setStyle(world, panel, { fg: '#ffffff', bg: '#0000ff' });

// Main loop
function gameLoop(): void {
  layoutSystem(world);
  renderSystem(world);
  outputSystem(world);
}

// Run loop
const interval = setInterval(gameLoop, 16);

// Cleanup on exit
process.on('SIGINT', () => {
  clearInterval(interval);
  cleanup();
  process.exit(0);
});
```

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `outputSystem(world)` | Main output system (register with scheduler) |
| `createOutputSystem()` | Factory function returning outputSystem |
| `setOutputStream(stream)` | Set the output writable stream |
| `getOutputStream()` | Get current output stream |
| `clearOutputStream()` | Clear the output stream reference |
| `setOutputBuffer(db)` | Set the double buffer for output |
| `getOutputBuffer()` | Get current output buffer |
| `clearOutputBuffer()` | Clear the output buffer reference |
| `createOutputState()` | Create fresh output state |
| `getOutputState()` | Get or create global output state |
| `resetOutputState()` | Reset global output state |
| `generateOutput(state, changes)` | Generate ANSI output from cell changes |
| `writeRaw(data)` | Write raw string to output stream |
| `hideCursor()` | Hide terminal cursor |
| `showCursor()` | Show terminal cursor |
| `cursorHome()` | Move cursor to position (0, 0) |
| `enterAlternateScreen()` | Enter alternate screen buffer |
| `leaveAlternateScreen()` | Leave alternate screen buffer |
| `clearScreen()` | Clear entire screen |
| `resetAttributes()` | Reset all terminal attributes |
| `cleanup()` | Clean up terminal state before exit |

### Types

```typescript
interface OutputState {
  /** Last cursor X position (0-indexed) */
  lastX: number;
  /** Last cursor Y position (0-indexed) */
  lastY: number;
  /** Last foreground color */
  lastFg: number;
  /** Last background color */
  lastBg: number;
  /** Last attributes */
  lastAttrs: number;
  /** Whether in alternate screen mode */
  alternateScreen: boolean;
}
```

## ANSI Escape Sequences

The output system generates standard ANSI escape sequences:

| Sequence | Description |
|----------|-------------|
| `\x1b[{row};{col}H` | Move cursor to position |
| `\x1b[{n}C` | Move cursor forward n columns |
| `\x1b[{n}G` | Move cursor to column n |
| `\x1b[38;2;{r};{g};{b}m` | Set foreground RGB color |
| `\x1b[48;2;{r};{g};{b}m` | Set background RGB color |
| `\x1b[39m` | Reset foreground to default |
| `\x1b[49m` | Reset background to default |
| `\x1b[0m` | Reset all attributes |
| `\x1b[1m` | Bold |
| `\x1b[2m` | Dim |
| `\x1b[3m` | Italic |
| `\x1b[4m` | Underline |
| `\x1b[7m` | Inverse |
| `\x1b[?25l` | Hide cursor |
| `\x1b[?25h` | Show cursor |
| `\x1b[?1049h` | Enter alternate screen |
| `\x1b[?1049l` | Leave alternate screen |
| `\x1b[2J` | Clear screen |
| `\x1b[H` | Cursor home |

## Performance Tips

1. **Use double buffering** - Only changed cells are output
2. **Batch updates** - The system processes all changes in one write
3. **Let colors persist** - Avoid unnecessary color changes
4. **Sort by position** - The system handles this automatically
5. **Use alternate screen** - Prevents scroll-back pollution

## See Also

- [Render System](./render.md) - Draw entities to buffer
- [Double Buffer](../terminal/double-buffer.md) - Efficient change detection
- [Cell](../terminal/cell.md) - Cell data structure
