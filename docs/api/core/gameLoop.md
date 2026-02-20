# Game Loop & Phase Management API

The game loop manages the main update cycle with input priority guarantees, lifecycle hooks, fixed timestep support, and performance statistics.

## Import

```typescript
import type { GameLoop, PhaseManager } from 'blecsd/core';
import {
  createGameLoop,
  LoopPhase,
  LoopState,
  BUILTIN_PHASE_NAMES,
  isBuiltinPhase,
  isLoopRunning,
  isLoopPaused,
} from 'blecsd/core';
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
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 });

// INPUT phase processes ALL pending input every frame
// Even in fixed timestep mode, INPUT runs at the render frame rate
const inputSystem = (w: typeof world) => w;
const gameLogicSystem = (w: typeof world) => w;
const renderSystem = (w: typeof world) => w;

loop.registerSystem(LoopPhase.UPDATE, gameLogicSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);
// Note: INPUT phase is protected - use createInputSystem() for input handling
```

## Creating a Game Loop

```typescript
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';

const world = createWorld();
const loop = createGameLoop(world, {
  targetFPS: 60,
  maxDeltaTime: 0.1,
});

const processInputSystem = (w: typeof world) => w;
const movementSystem = (w: typeof world) => w;
const animationSystem = (w: typeof world) => w;
const renderSystem = (w: typeof world) => w;

// Register systems in their phases
loop.registerSystem(LoopPhase.UPDATE, movementSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

// processInputSystem and animationSystem registered in a real app:
// loop.registerSystem(LoopPhase.INPUT, processInputSystem);
// loop.registerSystem(LoopPhase.ANIMATION, animationSystem);

// Start the loop (in production: loop.start())
console.log('Loop state:', loop.getState());
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
import { createWorld, createGameLoop } from 'blecsd/core';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 });

// loop.start();     // Start or resume the loop
// loop.stop();      // Stop completely (resets stats)
// loop.pause();     // Pause (can resume)
// loop.resume();    // Resume from pause

loop.step(1/60);  // Run a single frame manually with explicit delta time

// loop.stepFixed(); // Run a single fixed update (requires fixedTimestepMode)
console.log('Loop state after step:', loop.getState());
```

## State Checking

```typescript
import { createWorld, createGameLoop } from 'blecsd/core';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 });

loop.isRunning();  // true if loop is active
loop.isPaused();   // true if paused
loop.isStopped();  // true if stopped
loop.getState();   // LoopState.RUNNING | PAUSED | STOPPED
```

## System Registration

```typescript
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 });

const mySystem = (w: typeof world) => w;
const criticalSystem = (w: typeof world) => w;
const normalSystem = (w: typeof world) => w;
const lateSystem = (w: typeof world) => w;

// Register a system in a specific phase
loop.registerSystem(LoopPhase.UPDATE, mySystem);

// With priority (lower = runs earlier within the phase)
loop.registerSystem(LoopPhase.UPDATE, criticalSystem, -10);
loop.registerSystem(LoopPhase.UPDATE, normalSystem, 0);
loop.registerSystem(LoopPhase.UPDATE, lateSystem, 10);

// Unregister
loop.unregisterSystem(mySystem);
```

## Lifecycle Hooks

```typescript
import { createWorld, createGameLoop } from 'blecsd/core';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 }, {
  onStart: () => console.log('Loop started'),
  onStop: () => console.log('Loop stopped'),
  onPause: () => console.log('Loop paused'),
  onResume: () => console.log('Loop resumed'),
});
// Run a single frame to verify the hook fires
loop.start();
loop.stop();
```

## Performance Statistics

```typescript
import { createWorld, createGameLoop } from 'blecsd/core';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 });
const stats = loop.getStats();

console.log('FPS:', stats.fps);
console.log('Frame time (ms):', stats.frameTime);
console.log('Frame count:', stats.frameCount);
console.log('Running time (s):', stats.runningTime);
```

## Fixed Timestep Mode

Fixed timestep ensures deterministic game logic while keeping input responsive and rendering smooth.

```typescript
import { createWorld, createGameLoop } from 'blecsd/core';

const world = createWorld();
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
loop.step(1/60);
console.log('Fixed timestep loop state:', loop.getState());
```

### Interpolation

```typescript
import { createWorld, createGameLoop } from 'blecsd/core';

const world = createWorld();
let prevX = 0, currentX = 10;
let prevY = 0, currentY = 5;
const loop = createGameLoop(world, {
  fixedTimestepMode: {
    tickRate: 30,
    maxUpdatesPerFrame: 5,
    interpolate: true,
  },
}, {
  onInterpolate: (_w, alpha) => {
    // Interpolate positions for smooth rendering at 60fps
    // even though logic runs at 30 ticks/sec
    const renderX = prevX + (currentX - prevX) * alpha;
    const renderY = prevY + (currentY - prevY) * alpha;
    console.log(`Render position: (${renderX.toFixed(2)}, ${renderY.toFixed(2)})`);
  },
});
loop.step(1/60);
console.log('Interpolation example - prevX:', prevX, 'currentX:', currentX);
```

## PhaseManager

The PhaseManager allows adding custom phases between built-in phases.

```typescript
import { createPhaseManager, LoopPhase, isBuiltinPhase } from 'blecsd/core';

const manager = createPhaseManager();

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
import { createWorld, createGameLoop, isLoopRunning, isLoopPaused } from 'blecsd/core';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 });

// Safe checks that handle undefined
isLoopRunning(loop);    // true/false
isLoopRunning(undefined); // false

isLoopPaused(loop);     // true/false
```

## Complete Example

```typescript
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';

const world = createWorld();

const gameLogicSystem = (w: typeof world) => w;
const animationSystem = (w: typeof world) => w;
const layoutSystem = (w: typeof world) => w;
const renderSystem = (w: typeof world) => w;

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
  onBeforeRender: (_w, _dt) => {
    const stats = loop.getStats();
    if (stats.skippedUpdates > 0) {
      console.warn(`Skipped ${stats.skippedUpdates} updates`);
    }
  },
});

// Register systems
loop.registerSystem(LoopPhase.UPDATE, gameLogicSystem);
loop.registerSystem(LoopPhase.LAYOUT, layoutSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);
// animationSystem registered in a real app:
// loop.registerSystem(LoopPhase.ANIMATION, animationSystem);

// In production: loop.start();
loop.step(1/60);
const finalStats = loop.getStats();
console.log('Frame count:', finalStats.frameCount);
```
