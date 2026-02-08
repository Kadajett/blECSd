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
// ❌ WRONG: Camera updates before player moves
loop.registerSystem(LoopPhase.UPDATE, cameraFollowSystem);
loop.registerSystem(LoopPhase.LATE_UPDATE, playerMovementSystem);
// Result: Camera is always one frame behind player

// ✅ CORRECT: Player moves first, then camera follows
loop.registerSystem(LoopPhase.UPDATE, playerMovementSystem);
loop.registerSystem(LoopPhase.LATE_UPDATE, cameraFollowSystem);
// Result: Camera tracks player smoothly
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
// INPUT phase is managed by blECSd
// You don't need to register input systems manually
const loop = createGameLoop(world, { targetFPS: 60 });

// Input is automatically processed first
loop.start();
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
import { createGameLoop, LoopPhase } from 'blecsd';

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

loop.registerSystem(LoopPhase.EARLY_UPDATE, prepareInputSystem);
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
import { defineQuery, Position, Velocity } from 'blecsd';

const movableEntities = defineQuery([Position, Velocity]);

function movementSystem(world: World): World {
  const entities = movableEntities(world);

  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }

  return world;
}

loop.registerSystem(LoopPhase.UPDATE, movementSystem);
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
function cameraFollowSystem(world: World): World {
  const player = getPlayerEntity(world);
  const camera = getCameraEntity(world);

  if (!player || !camera) return world;

  // Player has already moved in UPDATE phase
  // Now camera follows player's new position
  Position.x[camera] = Position.x[player] - (Dimensions.width[camera] / 2);
  Position.y[camera] = Position.y[player] - (Dimensions.height[camera] / 2);

  return world;
}

loop.registerSystem(LoopPhase.LATE_UPDATE, cameraFollowSystem);
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
import { defineQuery, Position, Velocity, Spring } from 'blecsd';

const springEntities = defineQuery([Position, Velocity, Spring]);

function springAnimationSystem(world: World, dt: number): World {
  const entities = springEntities(world);

  for (const eid of entities) {
    // Spring physics: smooth motion toward target
    const targetX = Spring.targetX[eid];
    const targetY = Spring.targetY[eid];
    const stiffness = Spring.stiffness[eid];
    const damping = Spring.damping[eid];

    const dx = targetX - Position.x[eid];
    const dy = targetY - Position.y[eid];

    Velocity.x[eid] += dx * stiffness * dt;
    Velocity.y[eid] += dy * stiffness * dt;

    Velocity.x[eid] *= (1 - damping);
    Velocity.y[eid] *= (1 - damping);

    Position.x[eid] += Velocity.x[eid] * dt;
    Position.y[eid] += Velocity.y[eid] * dt;
  }

  return world;
}

loop.registerSystem(LoopPhase.ANIMATION, springAnimationSystem);
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
import { defineQuery, Position, Dimensions, Hierarchy } from 'blecsd';

const parentEntities = defineQuery([Position, Dimensions, Hierarchy]);

function layoutSystem(world: World): World {
  const entities = parentEntities(world);

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

loop.registerSystem(LoopPhase.LAYOUT, layoutSystem);
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
import { defineQuery, Position, Renderable } from 'blecsd';

const visibleEntities = defineQuery([Position, Renderable]);

function renderSystem(world: World): World {
  const screen = getScreenBuffer(world);
  const entities = visibleEntities(world);

  // Clear screen
  screen.clear();

  for (const eid of entities) {
    if (!Renderable.visible[eid]) continue;

    // Draw entity at its position
    screen.write(
      Position.x[eid],
      Position.y[eid],
      Renderable.char[eid],
      Renderable.fg[eid],
      Renderable.bg[eid],
    );
  }

  // Flush to terminal
  screen.flush();

  return world;
}

loop.registerSystem(LoopPhase.RENDER, renderSystem);
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
function debugOverlaySystem(world: World): World {
  const screen = getScreenBuffer(world);
  const fps = getFrameRate(world);

  // Draw FPS counter in top-right corner
  screen.write(
    screen.width - 10,
    0,
    `FPS: ${fps.toFixed(1)}`,
    0xffffffff,
    0x000000ff,
  );

  return world;
}

loop.registerSystem(LoopPhase.POST_RENDER, debugOverlaySystem);
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

loop.registerSystem(LoopPhase.UPDATE, collisionDetectionSystem);
loop.registerSystem(LoopPhase.LATE_UPDATE, collisionResponseSystem);
```

### Pattern 2: Conditional System Execution

Skip system execution when not needed:

```typescript
function aiSystem(world: World): World {
  if (isPaused(world)) return world;

  // AI logic only when game is running
  return world;
}

loop.registerSystem(LoopPhase.UPDATE, aiSystem);
```

### Pattern 3: Time-Based Systems

Use delta time for frame-rate independence:

```typescript
function physicsSystem(world: World, dt: number): World {
  const entities = physicsQuery(world);

  for (const eid of entities) {
    // Multiply by dt for frame-rate independence
    Velocity.y[eid] += GRAVITY * dt;
    Position.y[eid] += Velocity.y[eid] * dt;
  }

  return world;
}

loop.registerSystem(LoopPhase.ANIMATION, physicsSystem);
```

## Fixed Timestep Mode

For deterministic game logic, use fixed timestep:

```typescript
const loop = createGameLoop(world, {
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
```

See [Input Priority](./input-priority.md) for details on why INPUT always runs at full frame rate.

## Testing Phase Order

Verify systems run in the correct order:

```typescript
import { createGameLoop, LoopPhase } from 'blecsd';
import { describe, it, expect } from 'vitest';

describe('system execution order', () => {
  it('runs UPDATE before LATE_UPDATE', () => {
    const world = createWorld();
    const events: string[] = [];

    const loop = createGameLoop(world, { targetFPS: 60 });

    loop.registerSystem(LoopPhase.UPDATE, (world) => {
      events.push('update');
      return world;
    });

    loop.registerSystem(LoopPhase.LATE_UPDATE, (world) => {
      events.push('late_update');
      return world;
    });

    loop.step(1 / 60);

    expect(events).toEqual(['update', 'late_update']);
  });
});
```

## Common Mistakes

### Mistake 1: Processing Input in RENDER

```typescript
// ❌ WRONG: Checking input during render
loop.registerSystem(LoopPhase.RENDER, (world) => {
  if (isKeyPressed('space')) {  // Don't do this here
    togglePause();
  }
  render(world);
  return world;
});

// ✅ CORRECT: Process input in UPDATE
loop.registerSystem(LoopPhase.UPDATE, (world) => {
  if (isKeyPressed('space')) {
    togglePause();
  }
  return world;
});
```

### Mistake 2: Modifying Positions in RENDER

```typescript
// ❌ WRONG: Changing game state during render
loop.registerSystem(LoopPhase.RENDER, (world) => {
  for (const eid of entities) {
    Position.x[eid] += 1;  // Don't modify state here
    render(eid);
  }
  return world;
});

// ✅ CORRECT: Modify state in UPDATE, render in RENDER
loop.registerSystem(LoopPhase.UPDATE, (world) => {
  for (const eid of entities) {
    Position.x[eid] += 1;
  }
  return world;
});

loop.registerSystem(LoopPhase.RENDER, (world) => {
  for (const eid of entities) {
    render(eid);
  }
  return world;
});
```

### Mistake 3: Heavy Computation Blocking INPUT

```typescript
// ❌ WRONG: Expensive operation blocks next INPUT phase
loop.registerSystem(LoopPhase.UPDATE, (world) => {
  expensiveComputation(); // 200ms operation
  return world;
});

// ✅ CORRECT: Break up heavy work across frames
let workIndex = 0;

loop.registerSystem(LoopPhase.UPDATE, (world) => {
  // Process a chunk per frame
  processChunk(workIndex, CHUNK_SIZE);
  workIndex = (workIndex + CHUNK_SIZE) % TOTAL_WORK;
  return world;
});
```

## Related Documentation

- [Input Priority](./input-priority.md) - Why INPUT phase is always first
- [Understanding ECS](./understanding-ecs.md) - ECS concepts for newcomers
- [Game Loop API](../api/game-loop.md) - Game loop API reference
- [Performance Guide](../performance/optimization.md) - Optimizing system performance
