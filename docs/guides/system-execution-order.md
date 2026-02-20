# System Execution Order and Phases

This guide explains how blECSd's game loop organizes system execution into phases, why phase ordering matters, and how to choose the right phase for your systems.

## Loop Phases Overview

Every frame, blECSd executes systems in a fixed order across 8 phases:

```
┌──────────────┐
│   INPUT      │ Process all keyboard/mouse events (immutable order)
├──────────────┤
│ EARLY_UPDATE │ Read input state, prepare for main logic
├──────────────┤
│   UPDATE     │ Main game logic, entity movement, state machines
├──────────────┤
│ LATE_UPDATE  │ Dependent logic (camera following player, derived state)
├──────────────┤
│  ANIMATION   │ Physics, tweens, momentum scrolling, spring dynamics
├──────────────┤
│   LAYOUT     │ Calculate UI positions and sizes
├──────────────┤
│   RENDER     │ Draw to screen buffer
├──────────────┤
│ POST_RENDER  │ Debug overlays, effects, profiling output
└──────────────┘
```

**The INPUT phase is immutable** - it always runs first and cannot be reordered. All other phases can be customized, but their default order is carefully designed for common use cases.

## Why Phase Ordering Matters

Systems that depend on other systems' output must run **after** those systems:

```typescript
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';
import type { World } from 'blecsd/core';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 });

function playerMovementSystem(world: World): World { return world; }
function cameraFollowSystem(world: World): World { return world; }

// ❌ WRONG: Camera updates before player moves
// loop.registerSystem(LoopPhase.UPDATE, cameraFollowSystem);
// loop.registerSystem(LoopPhase.LATE_UPDATE, playerMovementSystem);
// Result: Camera is always one frame behind player

// ✅ CORRECT: Player moves first, then camera follows
loop.registerSystem(LoopPhase.UPDATE, playerMovementSystem);
loop.registerSystem(LoopPhase.LATE_UPDATE, cameraFollowSystem);
// Result: Camera tracks player smoothly
loop.start();
loop.stop();
```

## Phase Details

### INPUT Phase

**Purpose**: Process all pending keyboard and mouse input

**Characteristics**:
- Runs first, always
- Cannot be reordered
- Drains the entire input buffer (processes ALL pending events)
- Managed by blECSd's input system

**What runs here**:
- Keyboard event parsing
- Mouse event parsing
- Focus management
- Input validation

**You typically don't register custom systems here** - blECSd's input system handles this automatically.

```typescript
import { createWorld, createGameLoop } from 'blecsd/core';

// INPUT phase is managed by blECSd
// You don't need to register input systems manually
const inputWorld = createWorld();
const inputLoop = createGameLoop(inputWorld, { targetFPS: 60 });

// Input is automatically processed first
inputLoop.start();
inputLoop.stop();
```

---

### EARLY_UPDATE Phase

**Purpose**: Read input state and prepare for main game logic

**Characteristics**:
- First customizable phase
- Input has already been processed
- Good for preparing state before main UPDATE

**What goes here**:
- Reading input state into game-specific structures
- Resetting per-frame flags
- Pre-processing for UPDATE phase
- State machine initialization

**Example**:

```typescript
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';
import type { World } from 'blecsd/core';

const euWorld = createWorld();
const euLoop = createGameLoop(euWorld, { targetFPS: 60 });

const PlayerIntent = { MoveForward: 'moveForward', Jump: 'jump' } as const;
function getInputState(_world: World): Set<string> { return new Set(); }
function setPlayerIntent(_world: World, _intent: string): void {}

function prepareInputSystem(world: World): World {
  // Input events have been parsed by INPUT phase
  // Now convert them to game-specific state
  const pressedKeys = getInputState(world);

  if (pressedKeys.has('w')) {
    setPlayerIntent(world, PlayerIntent.MoveForward);
  }
  if (pressedKeys.has('space')) {
    setPlayerIntent(world, PlayerIntent.Jump);
  }

  return world;
}

euLoop.registerSystem(LoopPhase.EARLY_UPDATE, prepareInputSystem);
euLoop.start();
euLoop.stop();
```

---

### UPDATE Phase

**Purpose**: Main game logic, entity movement, state machines

**Characteristics**:
- Core logic phase
- Most game systems run here
- Input is ready, layout hasn't happened yet

**What goes here**:
- Player movement
- AI behavior
- Game state machines
- Entity spawning/destruction
- Collision response
- Health/damage calculations

**Example**:

```typescript
import { createWorld, createGameLoop, query, LoopPhase } from 'blecsd/core';
import type { World } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';

const upWorld = createWorld();
const upLoop = createGameLoop(upWorld, { targetFPS: 60 });

function movementSystem(world: World): World {
  const entities = query(world, [Position, Velocity]);

  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }

  return world;
}

upLoop.registerSystem(LoopPhase.UPDATE, movementSystem);
upLoop.start();
upLoop.stop();
```

---

### LATE_UPDATE Phase

**Purpose**: Dependent logic that relies on UPDATE phase output

**Characteristics**:
- Runs after main UPDATE
- Good for derived/dependent calculations
- Common for cameras, UI tracking

**What goes here**:
- Camera systems (following player)
- UI elements that track game entities
- Derived state calculations
- Post-movement adjustments

**Example**:

```typescript
import { createWorld, addEntity, createGameLoop, LoopPhase } from 'blecsd/core';
import type { World } from 'blecsd/core';
import { Position, Dimensions } from 'blecsd/components';

const luWorld = createWorld();
const luLoop = createGameLoop(luWorld, { targetFPS: 60 });
const luPlayer = addEntity(luWorld);
const luCamera = addEntity(luWorld);

function getPlayerEntity(_world: World): number { return luPlayer; }
function getCameraEntity(_world: World): number { return luCamera; }

function cameraFollowSystem2(world: World): World {
  const player = getPlayerEntity(world);
  const camera = getCameraEntity(world);

  if (!player || !camera) return world;

  // Player has already moved in UPDATE phase
  // Now camera follows player's new position
  Position.x[camera] = Position.x[player] - (Dimensions.width[camera] / 2);
  Position.y[camera] = Position.y[player] - (Dimensions.height[camera] / 2);

  return world;
}

luLoop.registerSystem(LoopPhase.LATE_UPDATE, cameraFollowSystem2);
luLoop.start();
luLoop.stop();
```

---

### ANIMATION Phase

**Purpose**: Physics-based animations, tweens, spring dynamics

**Characteristics**:
- Time-based transformations
- Smooth motion and transitions
- Can be frame-rate independent

**What goes here**:
- Physics simulations
- Spring/damping animations
- Momentum scrolling
- Tween systems
- Particle effects

**Why it's separate**: Animation often needs different time-stepping than game logic. Games might run at 30 ticks/sec while animations run at 60fps for smoothness.

**Example**:

```typescript
import { createWorld, createGameLoop, query, LoopPhase } from 'blecsd/core';
import type { World } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';

const animWorld = createWorld();
const animLoop = createGameLoop(animWorld, { targetFPS: 60 });

// Spring parameters per entity (stored externally for this example)
const springTargetX = new Float32Array(10000);
const springTargetY = new Float32Array(10000);
const springStiffness = new Float32Array(10000).fill(0.1);
const springDamping = new Float32Array(10000).fill(0.8);

function springAnimationSystem(world: World, dt: number): World {
  const entities = query(world, [Position, Velocity]);

  for (const eid of entities) {
    // Spring physics: smooth motion toward target
    const dx = springTargetX[eid] - Position.x[eid];
    const dy = springTargetY[eid] - Position.y[eid];

    Velocity.x[eid] += dx * springStiffness[eid] * dt;
    Velocity.y[eid] += dy * springStiffness[eid] * dt;

    Velocity.x[eid] *= (1 - springDamping[eid]);
    Velocity.y[eid] *= (1 - springDamping[eid]);

    Position.x[eid] += Velocity.x[eid] * dt;
    Position.y[eid] += Velocity.y[eid] * dt;
  }

  return world;
}

animLoop.registerSystem(LoopPhase.ANIMATION, springAnimationSystem);
animLoop.start();
animLoop.stop();
```

---

### LAYOUT Phase

**Purpose**: Calculate final UI positions and sizes

**Characteristics**:
- All game state is finalized
- Positions/dimensions are computed
- Runs before rendering

**What goes here**:
- Layout calculations (flexbox-like systems)
- Size constraints (min/max width/height)
- Parent-child positioning
- Scrollbar sizing
- Text wrapping

**Example**:

```typescript
import { createWorld, createGameLoop, query, LoopPhase } from 'blecsd/core';
import type { World } from 'blecsd/core';
import { Position, Dimensions, Hierarchy, getChildren } from 'blecsd/components';

const layWorld = createWorld();
const layLoop = createGameLoop(layWorld, { targetFPS: 60 });

function layoutSystem2(world: World): World {
  const entities = query(world, [Position, Dimensions, Hierarchy]);

  for (const eid of entities) {
    const children = getChildren(world, eid);

    let yOffset = 0;
    for (const child of children) {
      // Stack children vertically
      Position.x[child] = Position.x[eid] + 2; // 2px padding
      Position.y[child] = Position.y[eid] + yOffset;

      yOffset += Dimensions.height[child] + 1; // 1px gap
    }
  }

  return world;
}

layLoop.registerSystem(LoopPhase.LAYOUT, layoutSystem2);
layLoop.start();
layLoop.stop();
```

---

### RENDER Phase

**Purpose**: Draw visible entities to the screen buffer

**Characteristics**:
- All positions are final
- Read-only phase (don't modify game state)
- Outputs to screen buffer

**What goes here**:
- Drawing entities to screen
- Rendering borders, backgrounds
- Text rendering
- Sprite/tile rendering

**Example**:

```typescript
import { createWorld, createGameLoop, query, LoopPhase } from 'blecsd/core';
import type { World } from 'blecsd/core';
import { Position, Renderable } from 'blecsd/components';
import { renderSystem } from 'blecsd/systems';

const renWorld = createWorld();
const renLoop = createGameLoop(renWorld, { targetFPS: 60 });

// Custom render system that iterates entities
function myRenderSystem(world: World): World {
  const entities = query(world, [Position, Renderable]);

  for (const eid of entities) {
    if (!Renderable.visible[eid]) continue;

    // Draw entity at its position using terminal output
    const x = Position.x[eid];
    const y = Position.y[eid];
    process.stderr.write(`Entity ${eid} at (${x}, ${y})\n`);
    // process.stdout.write(...) in real usage
  }

  return world;
}

// Use the built-in renderSystem or register a custom one
renLoop.registerSystem(LoopPhase.RENDER, myRenderSystem);
console.log('renderSystem available:', typeof renderSystem);
renLoop.start();
renLoop.stop();
```

---

### POST_RENDER Phase

**Purpose**: Effects, debug overlays, profiling output

**Characteristics**:
- Runs after main rendering
- Can draw on top of everything
- Good for diagnostics

**What goes here**:
- FPS counter
- Debug info overlays
- Profiling visualization
- Screenshot capture
- Post-processing effects

**Example**:

```typescript
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';
import type { World } from 'blecsd/core';

const prWorld = createWorld();
const prLoop = createGameLoop(prWorld, { targetFPS: 60 });

function debugOverlaySystem(world: World): World {
  // Draw FPS counter in top-right corner
  // In a real app, write FPS to terminal using ansi sequences
  const fpsText = `FPS: 60.0`;
  process.stderr.write(fpsText + '\r');
  return world;
}

prLoop.registerSystem(LoopPhase.POST_RENDER, debugOverlaySystem);
prLoop.start();
prLoop.stop();
```

---

## Phase Selection Guide

Use this table to decide which phase to use:

| System Type | Phase | Reason |
|------------|-------|--------|
| Input parsing | INPUT | Automatic (managed by blECSd) |
| Convert input to game intent | EARLY_UPDATE | After input, before game logic |
| Player movement | UPDATE | Core game logic |
| AI behavior | UPDATE | Core game logic |
| Collision detection | UPDATE | Core game logic |
| Camera following player | LATE_UPDATE | Depends on player position |
| UI tracking game entities | LATE_UPDATE | Depends on entity positions |
| Spring animations | ANIMATION | Time-based physics |
| Particle systems | ANIMATION | Time-based effects |
| Flexbox-like layout | LAYOUT | After positions set, before render |
| Text wrapping | LAYOUT | Calculate before rendering |
| Draw entities | RENDER | Final visual output |
| FPS counter | POST_RENDER | Debug overlay on top |

## Common Patterns

### Pattern 1: Multi-Phase System

Some systems need to run in multiple phases:

```typescript
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';
import type { World } from 'blecsd/core';

const p1World = createWorld();
const p1Loop = createGameLoop(p1World, { targetFPS: 60 });

// Collision detection in UPDATE
function collisionDetectionSystem(world: World): World {
  // Detect collisions, store results
  return world;
}

// Collision response in LATE_UPDATE
function collisionResponseSystem(world: World): World {
  // Move entities based on collision results
  return world;
}

p1Loop.registerSystem(LoopPhase.UPDATE, collisionDetectionSystem);
p1Loop.registerSystem(LoopPhase.LATE_UPDATE, collisionResponseSystem);
p1Loop.start();
p1Loop.stop();
```

### Pattern 2: Conditional System Execution

Skip system execution when not needed:

```typescript
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';
import type { World } from 'blecsd/core';

const p2World = createWorld();
const p2Loop = createGameLoop(p2World, { targetFPS: 60 });
let paused = false;

function isPaused(_world: World): boolean { return paused; }

function aiSystem(world: World): World {
  if (isPaused(world)) return world;

  // AI logic only when game is running
  return world;
}

p2Loop.registerSystem(LoopPhase.UPDATE, aiSystem);
p2Loop.start();
p2Loop.stop();
```

### Pattern 3: Time-Based Systems

Use delta time for frame-rate independence:

```typescript
import { createWorld, createGameLoop, query, LoopPhase } from 'blecsd/core';
import type { World } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';

const p3World = createWorld();
const p3Loop = createGameLoop(p3World, { targetFPS: 60 });
const GRAVITY = 9.8;

function physicsSystem(world: World, dt: number): World {
  const entities = query(world, [Position, Velocity]);

  for (const eid of entities) {
    // Multiply by dt for frame-rate independence
    Velocity.y[eid] += GRAVITY * dt;
    Position.y[eid] += Velocity.y[eid] * dt;
  }

  return world;
}

p3Loop.registerSystem(LoopPhase.ANIMATION, physicsSystem);
p3Loop.start();
p3Loop.stop();
```

## Fixed Timestep Mode

For deterministic game logic, use fixed timestep:

```typescript
import { createWorld, createGameLoop } from 'blecsd/core';

const ftWorld = createWorld();
const ftLoop = createGameLoop(ftWorld, {
  targetFPS: 60,
  fixedTimestepMode: {
    tickRate: 30,           // Logic runs at 30 ticks/sec
    maxUpdatesPerFrame: 5,  // Prevent spiral of death
    interpolate: true,      // Smooth rendering between ticks
  },
});

// Even with 30 tick/sec logic:
// - INPUT still runs at full frame rate (60+ fps)
// - RENDER interpolates positions for smooth visuals
// - Game logic (UPDATE, LATE_UPDATE) runs at 30 ticks/sec
ftLoop.start();
ftLoop.stop();
```

See [Input Priority](./input-priority.md) for details on why INPUT always runs at full frame rate.

## Testing Phase Order

Verify systems run in the correct order:

```typescript
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';
import { describe, it, expect } from 'vitest';

describe('system execution order', () => {
  it('runs UPDATE before LATE_UPDATE', () => {
    const testWorld = createWorld();
    const events: string[] = [];

    const testLoop = createGameLoop(testWorld, { targetFPS: 60 });

    testLoop.registerSystem(LoopPhase.UPDATE, (world) => {
      events.push('update');
      return world;
    });

    testLoop.registerSystem(LoopPhase.LATE_UPDATE, (world) => {
      events.push('late_update');
      return world;
    });

    testLoop.step(1 / 60);

    expect(events).toEqual(['update', 'late_update']);
    testLoop.stop();
  });
});
```

## Common Mistakes

### Mistake 1: Processing Input in RENDER

```typescript
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';

const m1World = createWorld();
const m1Loop = createGameLoop(m1World, { targetFPS: 60 });

function isKeyPressed(_key: string): boolean { return false; }
function togglePause(): void {}

// ❌ WRONG: Checking input during render (illustrative - commented out)
// m1Loop.registerSystem(LoopPhase.RENDER, (world) => {
//   if (isKeyPressed('space')) { togglePause(); }
//   return world;
// });

// ✅ CORRECT: Process input in UPDATE
m1Loop.registerSystem(LoopPhase.UPDATE, (world) => {
  if (isKeyPressed('space')) {
    togglePause();
  }
  return world;
});

m1Loop.start();
m1Loop.stop();
```

### Mistake 2: Modifying Positions in RENDER

```typescript
import { createWorld, createGameLoop, query, LoopPhase } from 'blecsd/core';
import { Position, Renderable } from 'blecsd/components';

const m2World = createWorld();
const m2Loop = createGameLoop(m2World, { targetFPS: 60 });
function render(_eid: number): void {}

// ❌ WRONG: Changing game state during render (illustrative - commented out)
// m2Loop.registerSystem(LoopPhase.RENDER, (world) => {
//   for (const eid of query(world, [Position])) {
//     Position.x[eid] += 1;  // Don't modify state here
//     render(eid);
//   }
//   return world;
// });

// ✅ CORRECT: Modify state in UPDATE, render in RENDER
m2Loop.registerSystem(LoopPhase.UPDATE, (world) => {
  for (const eid of query(world, [Position])) {
    Position.x[eid] += 1;
  }
  return world;
});

m2Loop.registerSystem(LoopPhase.RENDER, (world) => {
  for (const eid of query(world, [Position, Renderable])) {
    render(eid);
  }
  return world;
});

m2Loop.start();
m2Loop.stop();
```

### Mistake 3: Heavy Computation Blocking INPUT

```typescript
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';

const m3World = createWorld();
const m3Loop = createGameLoop(m3World, { targetFPS: 60 });
const CHUNK_SIZE = 100;
const TOTAL_WORK = 10000;
function processChunk(_index: number, _size: number): void {}

// ❌ WRONG: Expensive operation blocks next INPUT phase (illustrative)
// m3Loop.registerSystem(LoopPhase.UPDATE, (world) => {
//   expensiveComputation(); // 200ms operation
//   return world;
// });

// ✅ CORRECT: Break up heavy work across frames
let workIndex = 0;

m3Loop.registerSystem(LoopPhase.UPDATE, (world) => {
  // Process a chunk per frame
  processChunk(workIndex, CHUNK_SIZE);
  workIndex = (workIndex + CHUNK_SIZE) % TOTAL_WORK;
  return world;
});

m3Loop.start();
m3Loop.stop();
```

## Related Documentation

- [Input Priority](./input-priority.md) - Why INPUT phase is always first
- [Understanding ECS](./understanding-ecs.md) - ECS concepts for newcomers
- [Game Loop API](../api/core/gameLoop.md) - Game loop API reference
- [Performance Guide](../guides/performance.md) - Optimizing system performance
