# Scheduler

The Scheduler manages the ordered execution of ECS systems across phases. It enforces input priority by protecting the INPUT phase and provides methods for registering, unregistering, and querying systems.

> **Note**: For most applications, use [`createApp()`](../app.md) which automatically wires the scheduler and registers core systems. This API is for advanced scenarios requiring custom system scheduling.

## Import

```typescript
import { getDeltaTime } from 'blecsd/core';
import { createScheduler, LoopPhase } from 'blecsd/core';
```

## Basic Usage

```typescript
import { createScheduler, LoopPhase, createWorld } from 'blecsd/core';

const world = createWorld();
const scheduler = createScheduler();
const movementSystem = (w: ReturnType<typeof createWorld>) => w;
const collisionSystem = (w: ReturnType<typeof createWorld>) => w;
const layoutSystem = (w: ReturnType<typeof createWorld>) => w;
const renderSystem = (w: ReturnType<typeof createWorld>) => w;
const deltaTime = 16;

// Register systems to phases
scheduler.registerSystem(LoopPhase.UPDATE, movementSystem);
scheduler.registerSystem(LoopPhase.ANIMATION, collisionSystem);
scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

// Run all systems in a frame
scheduler.run(world, deltaTime);
```

## Phase Order

Systems execute in strict phase order. Within each phase, systems run by priority (lower value = earlier).

| Phase | Value | Description | Protected |
|-------|-------|-------------|-----------|
| `INPUT` | `0` | Process pending input events | Yes |
| `EARLY_UPDATE` | `1` | Pre-update logic | No |
| `UPDATE` | `2` | Main game/application logic | No |
| `LATE_UPDATE` | `3` | Post-update logic | No |
| `ANIMATION` | `4` | Physics and animation calculations | No |
| `LAYOUT` | `5` | UI layout calculation | No |
| `RENDER` | `6` | Render to screen buffer | No |
| `POST_RENDER` | `7` | Output to terminal, cleanup | No |

The `INPUT` phase is protected - attempting to register systems to it will throw an error.

## Methods

### System Registration

```typescript
import { createScheduler, LoopPhase } from 'blecsd/core';

const scheduler = createScheduler();
const mySystem = (w: object) => w;
const movementSystem2 = (w: object) => w;
const collisionSystem2 = (w: object) => w;

// Register a system to a phase
scheduler.registerSystem(LoopPhase.UPDATE, mySystem);

// Register with priority (lower = runs earlier)
scheduler.registerSystem(LoopPhase.UPDATE, movementSystem2, 0);
scheduler.registerSystem(LoopPhase.UPDATE, collisionSystem2, 10);

// Unregister from all phases
scheduler.unregisterSystem(mySystem);
```

### Execution

```typescript
import { createScheduler, createWorld } from 'blecsd/core';

const world = createWorld();
const scheduler = createScheduler();
const deltaTime = 16;
// Run all phases in order
scheduler.run(world, deltaTime);
```

### Querying

```typescript
import { createScheduler, LoopPhase } from 'blecsd/core';

const scheduler = createScheduler();
const mySystem = (w: object) => w;
scheduler.registerSystem(LoopPhase.UPDATE, mySystem);

// Get systems for a phase
const systems = scheduler.getSystemsForPhase(LoopPhase.UPDATE);

// Count systems
scheduler.getSystemCount(LoopPhase.UPDATE);  // Systems in one phase
scheduler.getTotalSystemCount();              // Total across all phases

// Check if registered
scheduler.hasSystem(mySystem);               // true/false
```

### Phase Management

```typescript
import { createScheduler, LoopPhase } from 'blecsd/core';

const scheduler = createScheduler();
// Clear all systems from a phase
scheduler.clearPhase(LoopPhase.UPDATE);

// Clear all phases except INPUT
scheduler.clearAllSystems();
```

## getDeltaTime()

Access the current frame's delta time from within a system:

```typescript
import { getDeltaTime } from 'blecsd/core';

const movementSystem = (world: object) => {
  const dt = getDeltaTime();
  // Move entities by velocity * dt for frame-rate independence
  console.log(`Moving entities with dt=${dt}`);
  return world;
};
```

## Example: Priority Ordering

```typescript
import { createScheduler, LoopPhase } from 'blecsd/core';

const scheduler = createScheduler();
const inputValidation = (w: object) => w;
const gameLogic = (w: object) => w;
const aiSystem = (w: object) => w;

// Lower priority number = runs first within the phase
scheduler.registerSystem(LoopPhase.UPDATE, inputValidation, 0);
scheduler.registerSystem(LoopPhase.UPDATE, gameLogic, 10);
scheduler.registerSystem(LoopPhase.UPDATE, aiSystem, 20);

// These all run in UPDATE phase, in order: inputValidation, gameLogic, aiSystem
```

## Example: Custom Game Loop

```typescript
import { getDeltaTime, createScheduler, LoopPhase, createWorld } from 'blecsd/core';

const world = createWorld();
const scheduler = createScheduler();
const gameLogic = (w: object) => w;
const layoutSystem = (w: object) => w;
const renderSystem = (w: object) => w;

scheduler.registerSystem(LoopPhase.UPDATE, gameLogic);
scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

// Manual loop
let lastTime = process.hrtime.bigint();

function tick() {
  const now = process.hrtime.bigint();
  const dt = Number(now - lastTime) / 1e9;
  lastTime = now;

  scheduler.run(world, dt);
  // In a real app, call setTimeout(tick, 16) for ~60fps
}

tick();
```

## Related

- [Game Loop](./gameLoop.md) - High-level loop with lifecycle management
- [Input System](../systems/input-system.md) - Input processing system
