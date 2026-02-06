# Resize Handling API

Terminal resize handling that connects terminal resize events to the ECS world, updating screen dimensions, buffers, and layout.

## Overview

The resize module handles:
- Detecting terminal resize events via Program or SIGWINCH
- Updating Screen component dimensions
- Resizing the double buffer
- Invalidating all layouts
- Marking all entities dirty for re-render
- Emitting resize events for application handling

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createResizeHandler,
  enableResizeHandling,
  disableResizeHandling,
  getResizeEventBus,
  setupSigwinchHandler,
} from 'blecsd';

const program = new Program();
const world = createWorld();
const screen = createScreenEntity(world, { width: 80, height: 24 });

// Create resize handler
const handler = createResizeHandler(world);

// Enable resize handling
enableResizeHandling(program, handler);

// Listen for resize events
getResizeEventBus().on('resize', ({ width, height, previousWidth, previousHeight }) => {
  console.log(`Resized from ${previousWidth}x${previousHeight} to ${width}x${height}`);
});

// When done
disableResizeHandling(program, handler);
```

## Resize Handler

### createResizeHandler

Creates a resize handler for the given world.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createResizeHandler } from 'blecsd';

const handler = createResizeHandler(world);
```

The handler will automatically:
1. Update Screen component dimensions
2. Resize the double buffer (if set)
3. Invalidate all layouts
4. Mark all entities dirty
5. Emit a resize event

**Returns:** `ResizeHandlerState` - Handler state for enabling/disabling.

### enableResizeHandling

Enables resize handling on a Program instance.

<!-- blecsd-doccheck:ignore -->
```typescript
import { enableResizeHandling } from 'blecsd';

const handler = createResizeHandler(world);
enableResizeHandling(program, handler);
```

### disableResizeHandling

Disables resize handling on a Program instance.

<!-- blecsd-doccheck:ignore -->
```typescript
import { disableResizeHandling } from 'blecsd';

disableResizeHandling(program, handler);
```

### getResizeHandler

Gets the active resize handler for a world.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getResizeHandler } from 'blecsd';

const handler = getResizeHandler(world);
if (handler) {
  console.log(`Current size: ${handler.lastWidth}x${handler.lastHeight}`);
}
```

## Manual Resize

### triggerResize

Manually triggers a resize. Useful for testing or external size sources.

```typescript
import { triggerResize } from 'blecsd';

// Handle resize from external source
triggerResize(world, process.stdout.columns, process.stdout.rows);
```

This performs all resize handling steps without requiring a Program instance.

## SIGWINCH Handling

### setupSigwinchHandler

Sets up a SIGWINCH signal handler as an alternative to Program-based handling.

```typescript
import { setupSigwinchHandler } from 'blecsd';

const cleanup = setupSigwinchHandler(world);

// When done
cleanup();
```

The SIGWINCH signal is sent by the operating system when the terminal is resized.

## Event Bus

### getResizeEventBus

Gets the resize event bus for subscribing to resize events.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getResizeEventBus } from 'blecsd';

const bus = getResizeEventBus();

bus.on('resize', ({ width, height, previousWidth, previousHeight }) => {
  console.log(`Terminal resized to ${width}x${height}`);

  // Re-layout UI if needed
  if (width < 60) {
    enableCompactMode();
  }
});
```

### resetResizeEventBus

Resets the resize event bus (for testing).

<!-- blecsd-doccheck:ignore -->
```typescript
import { resetResizeEventBus } from 'blecsd';

resetResizeEventBus();
```

## Types

### ResizeEventData

```typescript
interface ResizeEventData {
  readonly width: number;           // New width in columns
  readonly height: number;          // New height in rows
  readonly previousWidth: number;   // Previous width
  readonly previousHeight: number;  // Previous height
}
```

### ResizeHandlerState

```typescript
interface ResizeHandlerState {
  readonly world: World;           // The ECS world being managed
  lastWidth: number;               // Last known width
  lastHeight: number;              // Last known height
  readonly handler: ResizeHandler; // The resize handler function
}
```

### ResizeEventMap

```typescript
interface ResizeEventMap {
  resize: ResizeEventData;
}
```

## Integration Example

Complete example with Program and game loop:

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createWorld,
  createScheduler,
  LoopPhase,
  Program,
  createScreenEntity,
  createResizeHandler,
  enableResizeHandling,
  disableResizeHandling,
  getResizeEventBus,
  setOutputBuffer,
  createDoubleBuffer,
} from 'blecsd';

// Create world and screen
const world = createWorld();
const screen = createScreenEntity(world, { width: 80, height: 24 });

// Set up double buffer
const db = createDoubleBuffer(80, 24);
setOutputBuffer(db);

// Create program
const program = new Program();
await program.init();

// Set up resize handling
const resizeHandler = createResizeHandler(world);
enableResizeHandling(program, resizeHandler);

// Subscribe to resize events
const unsubscribe = getResizeEventBus().on('resize', ({ width, height }) => {
  console.log(`Resized to ${width}x${height}`);
});

// Game loop
let running = true;
while (running) {
  // Process systems
  scheduler.run(world, 1/60);

  // Brief pause
  await new Promise(r => setTimeout(r, 16));
}

// Cleanup
unsubscribe();
disableResizeHandling(program, resizeHandler);
program.cleanup();
```

## Best Practices

1. **Always clean up handlers** - Call `disableResizeHandling` or the SIGWINCH cleanup function when done.

2. **Handle both width and height** - Some terminals allow resizing in only one dimension.

3. **Debounce expensive operations** - Resize events can fire rapidly during drag resizing.

4. **Set minimum dimensions** - Guard against extremely small terminal sizes:

```typescript
getResizeEventBus().on('resize', ({ width, height }) => {
  if (width < 40 || height < 10) {
    showTooSmallMessage();
    return;
  }

  // Normal resize handling
});
```

5. **Re-render after resize** - The resize handler marks entities dirty, but you may need to trigger a render pass.
