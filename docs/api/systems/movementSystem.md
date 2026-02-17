# Movement System

The movement system updates entity positions based on velocity. It handles acceleration, friction, speed clamping, and applies the final velocity to position.

## Import

```typescript
import {
  movementSystem,
  createMovementSystem,
  registerMovementSystem,
  queryMovement,
  hasMovementSystem,
  updateMovements,
} from 'blecsd/systems';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createScheduler, LoopPhase } from 'blecsd/core';
import { registerMovementSystem } from 'blecsd/systems';
import { setPosition, setVelocity } from 'blecsd/components';

const world = createWorld();
const scheduler = createScheduler();

// Register the movement system
registerMovementSystem(scheduler);

// Create a moving entity
const entity = addEntity(world);
setPosition(world, entity, 10, 10);
setVelocity(world, entity, { x: 5, y: 0, maxSpeed: 10, friction: 0.9 });

// In your game loop
function gameLoop(deltaTime: number) {
  scheduler.run(world, deltaTime);
  // Entity moves 5 units/second to the right
}
```

## Recommended Phase

Register in the **UPDATE** phase:

```typescript
import { createScheduler, LoopPhase } from 'blecsd/core';
import { movementSystem } from 'blecsd/systems';

const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.UPDATE, movementSystem);
```

## System Behavior

Each frame, the movement system:

1. Reads delta time from the scheduler
2. Queries all entities with Velocity component
3. For each entity:
   - Applies acceleration to velocity (if Acceleration component present)
   - Applies friction to velocity
   - Clamps velocity to max speed
   - Applies velocity to position (if Position component present)

## Functions

### System Registration

```typescript
import { createWorld } from 'blecsd/core';
import { createScheduler, LoopPhase } from 'blecsd/core';
import {
  movementSystem,
  createMovementSystem,
  registerMovementSystem,
} from 'blecsd/systems';

const world = createWorld();
const scheduler = createScheduler();

// Register with scheduler (convenience function)
registerMovementSystem(scheduler);

// Or create and register manually
const system = createMovementSystem();
scheduler.registerSystem(LoopPhase.UPDATE, system);

// Or use the system directly
movementSystem(world);
```

### Query Functions

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { queryMovement, hasMovementSystem } from 'blecsd/systems';

const world = createWorld();
const eid = addEntity(world);

// Query all moving entities
const moving = queryMovement(world);
void moving;
// Returns: number[] (entity IDs)

// Check if entity has Velocity component
if (hasMovementSystem(world, eid)) {
  // Entity can move
}
```

### Manual Updates

```typescript
import { createWorld } from 'blecsd/core';
import { queryMovement, updateMovements } from 'blecsd/systems';

const world = createWorld();

// Update specific entities outside the system
const entities = queryMovement(world);
updateMovements(world, entities, 0.016);
```

## Velocity Store

The movement system uses a Structure of Arrays (SoA) pattern:

| Field | Type | Description |
|-------|------|-------------|
| `x` | `Float32Array` | Velocity on X axis (units/second) |
| `y` | `Float32Array` | Velocity on Y axis (units/second) |
| `maxSpeed` | `Float32Array` | Maximum speed (magnitude) |
| `friction` | `Float32Array` | Friction multiplier (0-1) |

## Physics Integration

The movement system processes physics in this order:

```
Acceleration → Velocity → Friction → Clamp → Position
```

### Acceleration

If an entity has an Acceleration component, it's applied first:

```typescript
// Internal system logic (conceptual)
const velocity = { x: 0, y: 0 };
const acceleration = { x: 5, y: 0 };
const deltaTime = 1 / 60;
velocity.x += acceleration.x * deltaTime;
velocity.y += acceleration.y * deltaTime;
```

### Friction

Friction slows the entity over time:

```typescript
// Internal system logic (conceptual)
const velocity2 = { x: 10, y: 0 };
const friction = 0.9;
velocity2.x *= friction; // Per frame, scaled by deltaTime
velocity2.y *= friction;
```

### Speed Clamping

Velocity magnitude is clamped to maxSpeed:

```typescript
// Internal system logic (conceptual)
const velocity3 = { x: 20, y: 0 };
const vx = velocity3.x;
const vy = velocity3.y;
const maxSpeed = 10;
const speed = Math.sqrt(vx * vx + vy * vy);
if (speed > maxSpeed) {
  velocity3.x = (vx / speed) * maxSpeed;
  velocity3.y = (vy / speed) * maxSpeed;
}
```

### Position Update

Finally, velocity is applied to position:

```typescript
// Internal system logic (conceptual)
const position = { x: 0, y: 0 };
const velocity4 = { x: 5, y: 0 };
const deltaTime2 = 1 / 60;
position.x += velocity4.x * deltaTime2;
position.y += velocity4.y * deltaTime2;
```

## Example: Player Movement

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createScheduler, LoopPhase } from 'blecsd/core';
import { registerMovementSystem } from 'blecsd/systems';
import { setPosition, setVelocity, setAcceleration } from 'blecsd/components';

const world = createWorld();
const scheduler = createScheduler();
registerMovementSystem(scheduler);

// Create player with physics
const player = addEntity(world);
setPosition(world, player, 40, 12);
setVelocity(world, player, {
  x: 0,
  y: 0,
  maxSpeed: 15,
  friction: 0.85,
});

// Handle input
function onKeyPress(key: string) {
  switch (key) {
    case 'left':
      setAcceleration(world, player, -50, 0);
      break;
    case 'right':
      setAcceleration(world, player, 50, 0);
      break;
    case 'up':
      setAcceleration(world, player, 0, -50);
      break;
    case 'down':
      setAcceleration(world, player, 0, 50);
      break;
  }
}

function onKeyRelease() {
  setAcceleration(world, player, 0, 0);
}
```

## Example: Projectiles

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, setVelocity, setAcceleration } from 'blecsd/components';

const world = createWorld();

// Create bullet that moves right at constant speed
function createBullet(startX: number, startY: number) {
  const bullet = addEntity(world);
  setPosition(world, bullet, startX, startY);
  setVelocity(world, bullet, {
    x: 30,          // 30 units/second
    y: 0,
    maxSpeed: 30,   // No acceleration needed
    friction: 1.0,  // No friction (keeps constant speed)
  });
  return bullet;
}

// Create falling particle with gravity
function createParticle(startX: number, startY: number) {
  const particle = addEntity(world);
  setPosition(world, particle, startX, startY);
  setVelocity(world, particle, {
    x: Math.random() * 10 - 5, // Random horizontal
    y: -10,                     // Initial upward velocity
    maxSpeed: 50,
    friction: 0.98,
  });
  setAcceleration(world, particle, 0, 30); // Gravity
  return particle;
}

void createBullet(0, 0);
void createParticle(0, 0);
```

## Example: Smooth Scrolling

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, setVelocity, getVelocity } from 'blecsd/components';

const world = createWorld();

// Smooth scroll container
const scrollContainer = addEntity(world);
setPosition(world, scrollContainer, 0, 0);
setVelocity(world, scrollContainer, {
  x: 0,
  y: 0,
  maxSpeed: 100,
  friction: 0.9, // Smooth deceleration
});

// Apply scroll impulse on wheel
function onScroll(deltaY: number) {
  const vel = getVelocity(world, scrollContainer);
  const vy = vel ? vel.y : 0;
  setVelocity(world, scrollContainer, {
    x: 0,
    y: vy + deltaY * 5,
    maxSpeed: 100,
    friction: 0.9,
  });
}
void onScroll;
```

## Performance Considerations

- Uses SoA layout for cache-efficient iteration
- Only processes entities with Velocity component
- Position update skipped if entity lacks Position component
- Default capacity: 10,000 entities

## Related

- [Animation System](./animationSystem.md) - Sprite animations
- [Collision System](./collisionSystem.md) - Collision detection
- [Camera System](./cameraSystem.md) - Camera following
