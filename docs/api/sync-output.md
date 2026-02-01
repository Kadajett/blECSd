# Synchronized Output

The SynchronizedOutput class manages synchronized output mode for flicker-free rendering, essential for smooth 60fps game rendering.

## Overview

In synchronized output mode (DEC 2026), the terminal buffers all output until the end marker is received, then displays the entire frame at once. This prevents partial frames from being displayed, eliminating screen tearing and flicker.

**Note:** This module is internal and not exported from the main package. It is used internally by the Program class.

## Quick Start

```typescript
import { SynchronizedOutput } from 'blecsd/terminal';

const syncOut = new SynchronizedOutput(process.stdout);

// Render a complete frame
syncOut.renderFrame(() => {
  process.stdout.write(screen.clear());
  process.stdout.write(renderGameState());
});
```

## Constructor

```typescript
new SynchronizedOutput(output: Writable, options?: SyncOutputOptions)
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
syncOut.renderFrame(() => {
  process.stdout.write(screen.clear());
  drawPlayer(playerX, playerY);
  drawEnemies(enemies);
  drawUI(score, health);
});
```

### renderFrameAsync()

Execute an async render function within a synchronized frame.

```typescript
async renderFrameAsync(renderFn: () => Promise<void>): Promise<void>
```

**Example:**

```typescript
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
import { SynchronizedOutput, isSyncOutputSupported } from 'blecsd/terminal';

const syncOut = new SynchronizedOutput(process.stdout, {
  supported: isSyncOutputSupported()
});
```

## Usage Patterns

### Game Loop

```typescript
import { SynchronizedOutput, isSyncOutputSupported, screen } from 'blecsd/terminal';

class Game {
  private syncOut: SynchronizedOutput;

  constructor() {
    this.syncOut = new SynchronizedOutput(process.stdout, {
      supported: isSyncOutputSupported()
    });
  }

  gameLoop() {
    setInterval(() => {
      this.update();
      this.render();
    }, 16); // ~60fps
  }

  render() {
    this.syncOut.renderFrame(() => {
      process.stdout.write(screen.clear());
      this.drawWorld();
      this.drawEntities();
      this.drawUI();
    });
  }
}
```

### Manual Frame Control

```typescript
const syncOut = new SynchronizedOutput(process.stdout);

function render() {
  syncOut.beginFrame();

  try {
    // Multiple write operations
    process.stdout.write(screen.clear());
    for (const entity of entities) {
      process.stdout.write(cursor.move(entity.x, entity.y));
      process.stdout.write(entity.char);
    }
  } finally {
    // Always end frame, even on error
    syncOut.endFrame();
  }
}
```

### Fallback for Unsupported Terminals

```typescript
const supported = isSyncOutputSupported();
const syncOut = new SynchronizedOutput(process.stdout, { supported });

// Code works the same regardless of support
syncOut.renderFrame(() => {
  // On supported terminals: buffered, flicker-free
  // On unsupported terminals: immediate output (may flicker)
  renderScene();
});
```

### Building Frames with OutputBuffer

```typescript
import { OutputBuffer, SynchronizedOutput } from 'blecsd/terminal';

const outputBuffer = new OutputBuffer();
const syncOut = new SynchronizedOutput(process.stdout);

function render() {
  // Build frame in memory
  outputBuffer.clear();
  outputBuffer.write(screen.clear());
  outputBuffer.writeAt(playerX, playerY, '@');

  // Write complete frame with sync
  syncOut.writeFrame(outputBuffer.getContents());
}
```

### Auto-Sync Mode

```typescript
const syncOut = new SynchronizedOutput(process.stdout, {
  supported: isSyncOutputSupported(),
  autoSync: true
});

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

- [Output Buffer](./output-buffer.md) - Efficient output buffering
- [ANSI Escape Codes](./ansi.md) - `sync.begin()` and `sync.end()` functions
- [Program](./program.md) - High-level terminal control
