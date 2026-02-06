# Scheduler

The Scheduler manages the ordered execution of ECS systems across phases. It enforces input priority by protecting the INPUT phase and provides methods for registering, unregistering, and querying systems.

## Import

```typescript
import { createScheduler, getDeltaTime, LoopPhase } from 'blecsd';
```

## Basic Usage

<!-- blecsd-doccheck:ignore -->
```typescript
import { createScheduler, LoopPhase } from 'blecsd';

const scheduler = createScheduler();

// Register systems to phases
scheduler.registerSystem(LoopPhase.UPDATE, movementSystem);
scheduler.registerSystem(LoopPhase.PHYSICS, collisionSystem);
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
| `PHYSICS` | `4` | Physics and animation calculations | No |
| `LAYOUT` | `5` | UI layout calculation | No |
| `RENDER` | `6` | Render to screen buffer | No |
| `POST_RENDER` | `7` | Output to terminal, cleanup | No |

The `INPUT` phase is protected - attempting to register systems to it will throw an error.

## Methods

### System Registration

```typescript
// Register a system to a phase
scheduler.registerSystem(LoopPhase.UPDATE, mySystem);

// Register with priority (lower = runs earlier)
scheduler.registerSystem(LoopPhase.UPDATE, movementSystem, 0);
scheduler.registerSystem(LoopPhase.UPDATE, collisionSystem, 10);

// Unregister from all phases
scheduler.unregisterSystem(mySystem);
```

### Execution

```typescript
// Run all phases in order
scheduler.run(world, deltaTime);
```

### Querying

```typescript
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
// Clear all systems from a phase
scheduler.clearPhase(LoopPhase.UPDATE);

// Clear all phases except INPUT
scheduler.clearAllSystems();
```

## getDeltaTime()

Access the current frame's delta time from within a system:

```typescript
import { getDeltaTime } from 'blecsd';

const movementSystem = (world) => {
  const dt = getDeltaTime();
  // Move entities by velocity * dt for frame-rate independence
  for (const eid of movingEntities(world)) {
    Position.x[eid] += Velocity.x[eid] * dt;
    Position.y[eid] += Velocity.y[eid] * dt;
  }
  return world;
};
```

## Example: Priority Ordering

```typescript
const scheduler = createScheduler();

// Lower priority number = runs first within the phase
scheduler.registerSystem(LoopPhase.UPDATE, inputValidation, 0);
scheduler.registerSystem(LoopPhase.UPDATE, gameLogic, 10);
scheduler.registerSystem(LoopPhase.UPDATE, aiSystem, 20);

// These all run in UPDATE phase, in order: inputValidation, gameLogic, aiSystem
```

## Example: Custom Game Loop

<!-- blecsd-doccheck:ignore -->
```typescript
import { createScheduler, getDeltaTime, LoopPhase } from 'blecsd';

const scheduler = createScheduler();

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

  setTimeout(tick, 16); // ~60fps
}

tick();
```

## Related

- [Game Loop](./gameLoop.md) - High-level loop with lifecycle management
- [Input System](../systems/input-system.md) - Input processing system
