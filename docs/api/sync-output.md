# Synchronized Output

The `createSynchronizedOutput` factory manages synchronized output mode for flicker-free rendering, essential for smooth 60fps game rendering.

## Overview

In synchronized output mode (DEC 2026), the terminal buffers all output until the end marker is received, then displays the entire frame at once. This prevents partial frames from being displayed, eliminating screen tearing and flicker.

**Note:** This module is internal and not exported from the main package. It is used internally by the Program class.

## Quick Start

```typescript
import { createSynchronizedOutput, screenSeq } from 'blecsd/terminal';

const renderGameState = () => '';

const syncOut = createSynchronizedOutput(process.stdout);

// Render a complete frame
syncOut.renderFrame(() => {
  process.stdout.write(screenSeq.clear());
  process.stdout.write(renderGameState());
});
```

## Factory Function

```typescript
function createSynchronizedOutput(output: Writable, options?: SyncOutputOptions): SynchronizedOutput
```

### SyncOutputOptions

```typescript
interface SyncOutputOptions {
  /** Whether synchronized output is supported by the terminal (default: true) */
  supported?: boolean;
  /** Whether to automatically wrap writes in sync markers (default: false) */
  autoSync?: boolean;
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `supported` | `boolean` | Whether synchronized output is supported (get/set) |
| `autoSync` | `boolean` | Whether auto-sync is enabled (get/set) |
| `inFrame` | `boolean` | Whether currently in a synchronized frame |

## Methods

### beginFrame()

Begin a synchronized frame. All output will be buffered until endFrame() is called.

```typescript
beginFrame(): void
```

**Example:**

```typescript
import { createSynchronizedOutput } from 'blecsd/terminal';
const syncOut = createSynchronizedOutput(process.stdout);
syncOut.beginFrame();
// ... render frame content ...
syncOut.endFrame();
```

### endFrame()

End a synchronized frame. Buffered output is flushed to the screen.

```typescript
endFrame(): void
```

### renderFrame()

Execute a render function within a synchronized frame. Automatically begins and ends the frame.

```typescript
renderFrame(renderFn: () => void): void
```

**Example:**

```typescript
import { createSynchronizedOutput, screenSeq } from 'blecsd/terminal';
const syncOut = createSynchronizedOutput(process.stdout);

syncOut.renderFrame(() => {
  process.stdout.write(screenSeq.clear());
  // Draw your scene here
  process.stdout.write('Hello, synchronized world!');
});
```

### renderFrameAsync()

Execute an async render function within a synchronized frame.

```typescript
async renderFrameAsync(renderFn: () => Promise<void>): Promise<void>
```

**Example:**

```typescript
import { createSynchronizedOutput } from 'blecsd/terminal';
const syncOut = createSynchronizedOutput(process.stdout);
const loadScene = async () => ({});
const renderScene = (_s: unknown) => {};

await syncOut.renderFrameAsync(async () => {
  const scene = await loadScene();
  renderScene(scene);
});
```

### writeFrame()

Write content wrapped in sync markers. Convenience method for single-write frames.

```typescript
writeFrame(content: string): void
```

**Example:**

```typescript
import { createSynchronizedOutput } from 'blecsd/terminal';
const syncOut = createSynchronizedOutput(process.stdout);
const buildFrame = () => 'frame content';
const frameContent = buildFrame();
syncOut.writeFrame(frameContent);
```

### write()

Write content, optionally wrapping in sync markers if autoSync is enabled.

```typescript
write(content: string): void
```

### getBeginMarker()

Get the begin sync marker (or empty string if not supported).

```typescript
getBeginMarker(): string
```

### getEndMarker()

Get the end sync marker (or empty string if not supported).

```typescript
getEndMarker(): string
```

## Terminal Support Detection

### isSyncOutputSupported()

Detect if synchronized output is likely supported by the current terminal.

```typescript
function isSyncOutputSupported(): boolean
```

**Supported terminals:**
- kitty
- foot
- contour
- WezTerm
- iTerm2 (3.5+)
- mintty (3.6+)

**Example:**

```typescript
import { createSynchronizedOutput, isSyncOutputSupported } from 'blecsd/terminal';

const syncOut = createSynchronizedOutput(process.stdout, {
  supported: isSyncOutputSupported()
});
```

## Usage Patterns

### Game Loop

```typescript
import { createSynchronizedOutput, isSyncOutputSupported, screenSeq } from 'blecsd/terminal';

const drawWorld = () => {};
const drawEntities = () => {};
const drawUI = () => {};
const update = () => {};

const syncOut = createSynchronizedOutput(process.stdout, {
  supported: isSyncOutputSupported()
});

const render = () => {
  syncOut.renderFrame(() => {
    process.stdout.write(screenSeq.clear());
    drawWorld();
    drawEntities();
    drawUI();
  });
};

// In production: setInterval(() => { update(); render(); }, 16);
console.log('render function ready:', typeof render === 'function');
```

### Manual Frame Control

```typescript
import { createSynchronizedOutput, screenSeq, cursorSeq } from 'blecsd/terminal';

const syncOut = createSynchronizedOutput(process.stdout);
const entities: Array<{ x: number; y: number; char: string }> = [];

const render = () => {
  syncOut.beginFrame();

  try {
    // Multiple write operations
    process.stdout.write(screenSeq.clear());
    for (const entity of entities) {
      process.stdout.write(cursorSeq.move(entity.x, entity.y));
      process.stdout.write(entity.char);
    }
  } finally {
    // Always end frame, even on error
    syncOut.endFrame();
  }
};

console.log('render function ready:', typeof render === 'function');
```

### Fallback for Unsupported Terminals

```typescript
import { createSynchronizedOutput, isSyncOutputSupported } from 'blecsd/terminal';

function renderScene() { /* render scene */ }

const supported = isSyncOutputSupported();
const syncOut = createSynchronizedOutput(process.stdout, { supported });

// Code works the same regardless of support
syncOut.renderFrame(() => {
  // On supported terminals: buffered, flicker-free
  // On unsupported terminals: immediate output (may flicker)
  renderScene();
});
```

### Building Frames with OutputBuffer

```typescript
import { createSynchronizedOutput, screenSeq } from 'blecsd/terminal';

const playerX = 10;
const playerY = 5;
const syncOut = createSynchronizedOutput(process.stdout);

const render = () => {
  // Build frame and write with sync
  const content = screenSeq.clear() + `\x1b[${playerY};${playerX}H@`;
  syncOut.writeFrame(content);
};

console.log('render function ready:', typeof render === 'function');
```

### Auto-Sync Mode

```typescript
import { createSynchronizedOutput, isSyncOutputSupported } from 'blecsd/terminal';

const syncOut = createSynchronizedOutput(process.stdout, {
  supported: isSyncOutputSupported(),
  autoSync: true
});

const frameContent1 = 'frame 1';
const frameContent2 = 'frame 2';
// Each write is automatically wrapped in sync markers
syncOut.write(frameContent1);
syncOut.write(frameContent2);
```

## How Synchronized Output Works

Without synchronized output:
```
Terminal receives: [clear screen][draw player][draw enemy 1][draw enemy 2]...
Display shows: Partial updates visible (flickering/tearing)
```

With synchronized output:
```
Terminal receives: [BEGIN SYNC][clear screen][draw player][draw enemy 1][draw enemy 2]...[END SYNC]
Display shows: Complete frame appears instantly (smooth)
```

The terminal internally buffers all content between the sync markers and displays it atomically when the end marker is received.

## Performance Considerations

- **Always use sync for games**: Even simple games benefit from synchronized output
- **Minimize frame content**: Only redraw what changed when possible
- **Combine with OutputBuffer**: Build frames in memory, then write with sync
- **Check support once**: Call `isSyncOutputSupported()` at startup, not every frame

## Related

- Output Buffer - Efficient output buffering
- [ANSI Escape Codes](./ansi.md) - `sync.begin()` and `sync.end()` functions
- [Program](./program.md) - High-level terminal control
