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

```typescript
// Inside the input system
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
import { createInputHandler } from 'blecsd';

const handler = createInputHandler(process.stdin);

handler.onKey((event) => {
  if (event.name === 'q' && event.ctrl) {
    process.exit(0);
  }
  if (event.name === 'up') {
    movePlayer(world, 0, -1);
  }
});

handler.start();
```

### Input with Game Loop

For games and complex UIs, register input as a system:

```typescript
import { createGameLoop, LoopPhase } from 'blecsd';

const loop = createGameLoop(world, { targetFPS: 60 });

// Input system runs first every frame
loop.registerSystem(LoopPhase.INPUT, (world) => {
  // This runs before UPDATE, PHYSICS, RENDER, etc.
  const events = pollInputEvents();
  for (const event of events) {
    applyInput(world, event);
  }
  return world;
});

// Game logic uses the input state
loop.registerSystem(LoopPhase.UPDATE, (world) => {
  // Input has already been processed this frame
  updateGameState(world);
  return world;
});
```

### Buffered Input for Complex Scenarios

For complex input handling with key combinations:

```typescript
import { createInputHandler } from 'blecsd';

const handler = createInputHandler(process.stdin, {
  escapeTimeout: 50,      // Short timeout for responsive escape detection
  maxBufferSize: 4096,    // Prevent memory issues from paste floods
});

// Multiple handlers can coexist
const unsubKey = handler.onKey(handleKeyEvent);
const unsubMouse = handler.onMouse(handleMouseEvent);
const unsubFocus = handler.onFocus(handleFocusEvent);
```

## Common Pitfalls

### Don't Block the Event Loop

If your UPDATE or RENDER phase takes too long, it delays the next INPUT phase:

```typescript
// BAD: Blocks the event loop
loop.registerSystem(LoopPhase.UPDATE, (world) => {
  // This 200ms operation delays input processing
  expensiveComputation();
  return world;
});

// GOOD: Break up heavy work
loop.registerSystem(LoopPhase.UPDATE, (world) => {
  // Process only a chunk per frame
  processChunk(world, CHUNK_SIZE);
  return world;
});
```

### Don't Skip Input Events

Never discard unprocessed input:

```typescript
// BAD: Only processes one event per frame
function inputSystem(world: World): World {
  const event = buffer.peek();
  if (event) {
    handleEvent(event);
    buffer.dequeue();
  }
  return world;
}

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

```typescript
// BAD: Checking input during render
loop.registerSystem(LoopPhase.RENDER, (world) => {
  if (isKeyPressed('space')) {  // Don't do this here
    togglePause();
  }
  render(world);
  return world;
});

// GOOD: Input in INPUT, rendering in RENDER
loop.registerSystem(LoopPhase.INPUT, (world) => {
  if (isKeyPressed('space')) {
    togglePause();
  }
  return world;
});
```

## Testing Input Responsiveness

Use the `step()` method to verify input processing:

```typescript
import { createGameLoop } from 'blecsd';

// Test that input is processed first
const events: string[] = [];

loop.registerSystem(LoopPhase.INPUT, (world) => {
  events.push('input');
  return world;
});

loop.registerSystem(LoopPhase.UPDATE, (world) => {
  events.push('update');
  return world;
});

loop.step(1/60);

expect(events).toEqual(['input', 'update']);
```
