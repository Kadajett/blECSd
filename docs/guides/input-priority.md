# Input Priority & Responsiveness

This guide explains how blECSd ensures input is always responsive, why this matters for terminal applications, and how to structure your code to maintain input priority.

## The Core Principle

**Input must ALWAYS feel responsive and smooth.** This is a non-negotiable requirement in blECSd.

No matter how complex your UI, how many entities are being processed, or how heavy your render pass is, keyboard and mouse input should never feel sluggish or dropped.

## How blECSd Ensures Input Priority

### 1. INPUT Phase Runs First

Every frame, the INPUT phase runs before any other processing:

```
Frame N:
  1. INPUT        <- Always first, processes ALL pending input
  2. EARLY_UPDATE
  3. UPDATE
  4. LATE_UPDATE
  5. PHYSICS
  6. LAYOUT
  7. RENDER
  8. POST_RENDER
```

The INPUT phase cannot be reordered. It is hardcoded to always execute first.

### 2. All Pending Input is Processed

The INPUT phase doesn't just process one event per frame. It drains the entire input buffer:

<!-- blecsd-doccheck:ignore -->
```typescript
// Illustrative pseudo-code showing internal input system behavior
// (inputBuffer is an internal API, not directly accessible)
function inputSystem(world: World): World {
  // Process ALL pending key/mouse events this frame
  // Not just one - ALL of them
  while (inputBuffer.hasEvents()) {
    const event = inputBuffer.dequeue();
    processEvent(world, event);
  }
  return world;
}
```

### 3. Fixed Timestep Preserves Input Rate

When using fixed timestep mode, game logic runs at a fixed rate (e.g., 60 ticks/second). But INPUT still runs every render frame:

```typescript
import { createGameLoop, createWorld } from 'blecsd/core';

const world = createWorld();
const loop = createGameLoop(world, {
    fixedTimestepMode: {
        tickRate: 30,           // Logic at 30 ticks/sec
        maxUpdatesPerFrame: 5,
        interpolate: true,
    },
});

// Even though logic runs at 30 ticks/sec:
// - INPUT runs at the full frame rate (60fps or higher)
// - No input events are ever delayed until the next tick
// - Rendering interpolates between ticks for smooth visuals
```

## Patterns for Responsive Input

### Direct Input Handling

For simple applications, handle input directly:

```typescript
import { createInputHandler } from 'blecsd/terminal';
import { createWorld } from 'blecsd/core';
import { setPosition, getPosition } from 'blecsd/components';

const world = createWorld();

function movePlayer(eid: number, dx: number, dy: number): void {
    const pos = getPosition(world, eid);
    setPosition(world, eid, (pos?.x ?? 0) + dx, (pos?.y ?? 0) + dy);
}

// Note: handler.start() subscribes to stdin; not called here to avoid blocking
const handler = createInputHandler(process.stdin);

handler.onKey((event) => {
    if (event.name === 'q' && event.ctrl) {
        process.exit(0);
    }
});
```

### Input with Game Loop

For games and complex UIs, register input as a system using the dedicated `registerInputSystem` method:

```typescript
import { createGameLoop, LoopPhase, createWorld } from 'blecsd/core';
import { inputSystem, getInputEventBus } from 'blecsd/systems';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 });

// Register using the dedicated input system registration method
// (using loop.registerSystem(LoopPhase.INPUT, ...) is not allowed)
loop.registerInputSystem(inputSystem);

// Game logic uses the input state
loop.registerSystem(LoopPhase.UPDATE, (world) => {
    // Input has already been processed this frame
    return world;
});
```

### Buffered Input for Complex Scenarios

For complex input handling with key combinations:

```typescript
import { createInputHandler } from 'blecsd/terminal';

const handler = createInputHandler(process.stdin, {
    escapeTimeout: 50,      // Short timeout for responsive escape detection
    maxBufferSize: 4096,    // Prevent memory issues from paste floods
});

// Multiple handlers can coexist
const unsubKey = handler.onKey((_event) => {});
const unsubMouse = handler.onMouse((_event) => {});
const unsubFocus = handler.onFocus((_event) => {});
```

## Common Pitfalls

### Don't Block the Event Loop

If your UPDATE or RENDER phase takes too long, it delays the next INPUT phase:

<!-- blecsd-doccheck:ignore -->
```typescript
// BAD: Blocks the event loop (anti-pattern - do not do this)
loop.registerSystem(LoopPhase.UPDATE, (world) => {
  expensiveComputation(); // This 200ms operation delays input processing
  return world;
});
```

<!-- blecsd-doccheck:ignore -->
```typescript
// GOOD: Break up heavy work into chunks
loop.registerSystem(LoopPhase.UPDATE, (world) => {
  processChunk(world, CHUNK_SIZE); // Process only a chunk per frame
  return world;
});
```

### Don't Skip Input Events

Never discard unprocessed input. Process all pending events each frame:

<!-- blecsd-doccheck:ignore -->
```typescript
// BAD: Only processes one event per frame (anti-pattern - do not do this)
function inputSystem(world: World): World {
  const event = buffer.peek();
  if (event) {
    handleEvent(event);
    buffer.dequeue();
  }
  return world;
}
```

<!-- blecsd-doccheck:ignore -->
```typescript
// GOOD: Process all pending events
function inputSystem(world: World): World {
  while (buffer.hasEvents()) {
    handleEvent(buffer.dequeue());
  }
  return world;
}
```

### Don't Process Input in RENDER

Input should affect state in INPUT/UPDATE, not during rendering:

<!-- blecsd-doccheck:ignore -->
```typescript
// BAD: Checking input during render (anti-pattern - do not do this)
loop.registerSystem(LoopPhase.RENDER, (world) => {
  if (isKeyPressed('space')) { // Don't check input here
    togglePause();
  }
  render(world);
  return world;
});
```

<!-- blecsd-doccheck:ignore -->
```typescript
// GOOD: Input in INPUT phase (via registerInputSystem), rendering in RENDER
loop.registerInputSystem((world) => {
  if (isKeyPressed('space')) {
    togglePause();
  }
  return world;
});
```

## Testing Input Responsiveness

Use the `step()` method to verify input processing order:

```typescript
import { createGameLoop, LoopPhase, createWorld } from 'blecsd/core';

const testWorld = createWorld();
const testLoop = createGameLoop(testWorld, { targetFPS: 60 });

// Test that input is processed first
const events: string[] = [];

testLoop.registerInputSystem((world) => {
    events.push('input');
    return world;
});

testLoop.registerSystem(LoopPhase.UPDATE, (world) => {
    events.push('update');
    return world;
});

testLoop.step(1/60);

// Verify order: input always comes before update
console.log(events); // ['input', 'update']
```
