# Game Loop & Phase Management API

The game loop manages the main update cycle with input priority guarantees, lifecycle hooks, fixed timestep support, and performance statistics.

## Import

```typescript
import {
  createGameLoop,
  GameLoop,
  LoopPhase,
  LoopState,
  PhaseManager,
  BUILTIN_PHASE_NAMES,
  isBuiltinPhase,
  isLoopRunning,
  isLoopPaused,
} from 'blecsd';
```

## Phase Execution Order

blECSd uses a fixed phase ordering where **INPUT always runs first**. This is a hard requirement that ensures responsive controls regardless of system load.

| Phase | Value | Purpose |
|-------|-------|---------|
| `INPUT` | 0 | Process all pending input (always first, cannot be reordered) |
| `EARLY_UPDATE` | 1 | Pre-update logic (AI decisions, state machine transitions) |
| `UPDATE` | 2 | Main game logic (movement, gameplay mechanics) |
| `LATE_UPDATE` | 3 | Post-update corrections (camera follow, constraint solving) |
| `PHYSICS` | 4 | Physics-based animations, springs, momentum, transitions |
| `LAYOUT` | 5 | UI layout calculation (flex, grid, constraints) |
| `RENDER` | 6 | Screen rendering (draw calls, buffer writes) |
| `POST_RENDER` | 7 | Cleanup after render (debug overlays, stat collection) |

### Why INPUT is Always First

Terminal applications must feel responsive. Even if a frame takes 50ms to render, input events should never be lost or delayed. By processing INPUT first every frame:

- Key presses are registered immediately
- Mouse clicks are never dropped
- The user always feels in control

```typescript
// INPUT phase processes ALL pending input every frame
// Even in fixed timestep mode, INPUT runs at the render frame rate
loop.registerSystem(LoopPhase.INPUT, inputSystem);
loop.registerSystem(LoopPhase.UPDATE, gameLogicSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);
```

## Creating a Game Loop

```typescript
import { createGameLoop, createWorld, LoopPhase } from 'blecsd';

const world = createWorld();
const loop = createGameLoop(world, {
  targetFPS: 60,
  maxDeltaTime: 0.1,
});

// Register systems in their phases
loop.registerSystem(LoopPhase.INPUT, processInputSystem);
loop.registerSystem(LoopPhase.UPDATE, movementSystem);
loop.registerSystem(LoopPhase.PHYSICS, animationSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

// Start the loop
loop.start();
```

## GameLoopOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `targetFPS` | `number` | `60` | Target frames per second (0 = uncapped) |
| `fixedTimestep` | `boolean` | `true` | Cap delta time (deprecated, use fixedTimestepMode) |
| `maxDeltaTime` | `number` | `0.1` | Maximum delta time in seconds |
| `fixedTimestepMode` | `FixedTimestepConfig` | - | Enable true fixed timestep |

### FixedTimestepConfig

```typescript
interface FixedTimestepConfig {
  tickRate: number;           // Fixed updates per second (default: 60)
  maxUpdatesPerFrame: number; // Prevents spiral of death (default: 5)
  interpolate: boolean;       // Smooth rendering between ticks (default: true)
}
```

## Lifecycle Methods

```typescript
loop.start();     // Start or resume the loop
loop.stop();      // Stop completely (resets stats)
loop.pause();     // Pause (can resume)
loop.resume();    // Resume from pause

loop.step();      // Run a single frame manually
loop.step(1/60);  // With explicit delta time

loop.stepFixed(); // Run a single fixed update (requires fixedTimestepMode)
```

## State Checking

```typescript
loop.isRunning();  // true if loop is active
loop.isPaused();   // true if paused
loop.isStopped();  // true if stopped
loop.getState();   // LoopState.RUNNING | PAUSED | STOPPED
```

## System Registration

```typescript
// Register a system in a specific phase
loop.registerSystem(LoopPhase.UPDATE, mySystem);

// With priority (lower = runs earlier within the phase)
loop.registerSystem(LoopPhase.UPDATE, criticalSystem, -10);
loop.registerSystem(LoopPhase.UPDATE, normalSystem, 0);
loop.registerSystem(LoopPhase.UPDATE, lateSystem, 10);

// Unregister
loop.unregisterSystem(mySystem);

// Register input system (internal)
loop.registerInputSystem(inputSystem);
```

## Lifecycle Hooks

```typescript
const loop = createGameLoop(world, options, {
  onStart: () => console.log('Loop started'),
  onStop: () => console.log('Loop stopped'),
  onPause: () => console.log('Loop paused'),
  onResume: () => console.log('Loop resumed'),

  onBeforeInput: (world, dt) => { /* before input phase */ },
  onAfterInput: (world, dt) => { /* after input phase */ },
  onBeforeUpdate: (world, dt) => { /* before update phase */ },
  onAfterUpdate: (world, dt) => { /* after update phase */ },
  onBeforeRender: (world, dt) => { /* before render phase */ },
  onAfterRender: (world, dt) => { /* after render phase */ },

  // Fixed timestep hooks
  onBeforeFixedUpdate: (world, fixedDt, tickNumber) => {},
  onAfterFixedUpdate: (world, fixedDt, tickNumber) => {},
  onInterpolate: (world, alpha) => {
    // Interpolate visual state between ticks
    // alpha is 0-1, representing position between last and next tick
  },
});
```

## Performance Statistics

```typescript
const stats = loop.getStats();

stats.fps;                // Current frames per second
stats.frameTime;          // Current frame time in ms
stats.frameCount;         // Total frames since start
stats.runningTime;        // Total running time in seconds
stats.tickCount;          // Total fixed updates (fixed timestep only)
stats.ticksPerSecond;     // Fixed updates per second
stats.interpolationAlpha; // Current interpolation factor (0-1)
stats.skippedUpdates;     // Updates skipped this frame (spiral of death)
```

## Fixed Timestep Mode

Fixed timestep ensures deterministic game logic while keeping input responsive and rendering smooth.

```typescript
const loop = createGameLoop(world, {
  fixedTimestepMode: {
    tickRate: 60,           // 60 physics/logic updates per second
    maxUpdatesPerFrame: 5,  // Prevent spiral of death
    interpolate: true,      // Smooth rendering between ticks
  },
});

// Frame execution order in fixed timestep:
// 1. Process INPUT (every frame, at render rate)
// 2. Accumulate real time
// 3. Run fixed updates at consistent rate (UPDATE, LATE_UPDATE, PHYSICS)
// 4. Calculate interpolation alpha
// 5. Run render phases (LAYOUT, RENDER, POST_RENDER)
```

### Interpolation

```typescript
const loop = createGameLoop(world, {
  fixedTimestepMode: {
    tickRate: 30,
    maxUpdatesPerFrame: 5,
    interpolate: true,
  },
}, {
  onInterpolate: (world, alpha) => {
    // Interpolate positions for smooth rendering at 60fps
    // even though logic runs at 30 ticks/sec
    const renderX = prevX + (currentX - prevX) * alpha;
    const renderY = prevY + (currentY - prevY) * alpha;
  },
});
```

## PhaseManager

The PhaseManager allows adding custom phases between built-in phases.

```typescript
import { PhaseManager, LoopPhase } from 'blecsd';

const manager = new PhaseManager();

// Add custom phase after UPDATE
const aiPhaseId = manager.registerPhase('AI', LoopPhase.UPDATE);

// Get all phases in order
const phases = manager.getPhaseOrder();
// [INPUT, EARLY_UPDATE, UPDATE, 'AI', LATE_UPDATE, PHYSICS, LAYOUT, RENDER, POST_RENDER]

// Check if a phase is built-in
isBuiltinPhase(LoopPhase.INPUT);  // true
isBuiltinPhase('AI');              // false
```

## LoopPhase Enum

```typescript
enum LoopPhase {
  INPUT = 0,
  EARLY_UPDATE = 1,
  UPDATE = 2,
  LATE_UPDATE = 3,
  PHYSICS = 4,
  LAYOUT = 5,
  RENDER = 6,
  POST_RENDER = 7,
}
```

## Helper Functions

```typescript
import { isLoopRunning, isLoopPaused } from 'blecsd';

// Safe checks that handle undefined
isLoopRunning(loop);    // true/false
isLoopRunning(undefined); // false

isLoopPaused(loop);     // true/false
```

## Complete Example

```typescript
import { createGameLoop, createWorld, LoopPhase } from 'blecsd';

const world = createWorld();

// Create game loop with fixed timestep
const loop = createGameLoop(world, {
  targetFPS: 60,
  fixedTimestepMode: {
    tickRate: 60,
    maxUpdatesPerFrame: 5,
    interpolate: true,
  },
}, {
  onStart: () => console.log('Game started'),
  onBeforeRender: (world, dt) => {
    const stats = loop.getStats();
    if (stats.skippedUpdates > 0) {
      console.warn(`Skipped ${stats.skippedUpdates} updates`);
    }
  },
});

// Register systems
loop.registerSystem(LoopPhase.INPUT, inputSystem);
loop.registerSystem(LoopPhase.UPDATE, gameLogicSystem);
loop.registerSystem(LoopPhase.PHYSICS, animationSystem);
loop.registerSystem(LoopPhase.LAYOUT, layoutSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

// Start the game
loop.start();

// Stop after signal
process.on('SIGINT', () => {
  loop.stop();
  process.exit(0);
});
```
