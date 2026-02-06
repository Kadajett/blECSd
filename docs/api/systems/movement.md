# Movement System API

ECS system for updating entity positions based on velocity, acceleration, and friction.

## Overview

The movement system handles:
- Applying acceleration to velocity
- Applying friction for natural deceleration
- Clamping velocity to a maximum speed
- Applying velocity to update entity positions

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createScheduler,
  registerMovementSystem,
  LoopPhase,
} from 'blecsd';

const scheduler = createScheduler();
registerMovementSystem(scheduler);

// In game loop
scheduler.run(world, deltaTime);
```

## Functions

### movementSystem

The movement system function. Reads delta time from the scheduler and processes all entities with the Velocity component.

For each entity, the system:
1. Applies acceleration to velocity (if Acceleration component is present)
2. Applies friction to velocity
3. Clamps velocity to max speed
4. Applies velocity to position (if Position component is present)

```typescript
const movementSystem: System
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { movementSystem, LoopPhase } from 'blecsd';

scheduler.registerSystem(LoopPhase.PHYSICS, movementSystem);
```

### createMovementSystem

Factory function that returns the movementSystem.

```typescript
function createMovementSystem(): System
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { createMovementSystem, createScheduler, LoopPhase } from 'blecsd';

const scheduler = createScheduler();
const system = createMovementSystem();
scheduler.registerSystem(LoopPhase.PHYSICS, system);
```

### registerMovementSystem

Convenience function that registers the movement system in the PHYSICS phase.

```typescript
function registerMovementSystem(scheduler: Scheduler, priority?: number): void
```

**Parameters:**
- `scheduler` - The scheduler to register with
- `priority` - Optional priority within the PHYSICS phase (default: 0)

<!-- blecsd-doccheck:ignore -->
```typescript
import { createScheduler, registerMovementSystem } from 'blecsd';

const scheduler = createScheduler();
registerMovementSystem(scheduler);
```

### queryMovement

Query all entities with the Velocity component.

```typescript
function queryMovement(world: World): number[]
```

### hasMovementSystem

Checks if an entity has the Velocity component via the system store.

```typescript
function hasMovementSystem(world: World, eid: number): boolean
```

### updateMovements

Manually update movement for specific entities. Useful for testing or custom update loops.

```typescript
function updateMovements(
  world: World,
  entities: readonly number[],
  deltaTime: number,
): void
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { updateMovements, queryMovement } from 'blecsd';

const entities = queryMovement(world);
updateMovements(world, entities, 0.016); // ~60fps frame
```

## Usage Example

Complete movement setup with velocity, acceleration, and friction:

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createWorld,
  addEntity,
  createScheduler,
  registerMovementSystem,
  queryMovement,
  updateMovements,
  setPosition,
  setVelocity,
  setAcceleration,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Register movement system in PHYSICS phase
registerMovementSystem(scheduler);

// Create a moving entity
const projectile = addEntity(world);
setPosition(world, projectile, 10, 5);
setVelocity(world, projectile, 5, -2);  // Moving right and up

// Create an entity with acceleration
const rocket = addEntity(world);
setPosition(world, rocket, 0, 20);
setVelocity(world, rocket, 0, 0);
setAcceleration(world, rocket, 1, -0.5);  // Accelerating right and up

// Run in game loop
let lastTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  scheduler.run(world, dt);
}, 16);

// Or manually update specific entities
const movingEntities = queryMovement(world);
updateMovements(world, movingEntities, 1 / 60);
```
