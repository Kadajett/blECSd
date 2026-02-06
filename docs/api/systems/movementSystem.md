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
} from 'blecsd';
```

## Basic Usage

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  createScheduler,
  LoopPhase,
  registerMovementSystem,
  setPosition,
  setVelocity,
} from 'blecsd';

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

Register in the **PHYSICS** phase:

```typescript
scheduler.registerSystem(LoopPhase.PHYSICS, movementSystem);
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
// Register with scheduler (convenience function)
registerMovementSystem(scheduler, priority?);

// Or create and register manually
const system = createMovementSystem();
scheduler.registerSystem(LoopPhase.PHYSICS, system);

// Or use the system directly
movementSystem(world);
```

### Query Functions

```typescript
// Query all moving entities
const moving = queryMovement(world);
// Returns: number[] (entity IDs)

// Check if entity has Velocity component
if (hasMovementSystem(world, eid)) {
  // Entity can move
}
```

### Manual Updates

```typescript
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
velocity.x += acceleration.x * deltaTime;
velocity.y += acceleration.y * deltaTime;
```

### Friction

Friction slows the entity over time:

```typescript
velocity.x *= friction; // Per frame, scaled by deltaTime
velocity.y *= friction;
```

### Speed Clamping

Velocity magnitude is clamped to maxSpeed:

```typescript
const speed = Math.sqrt(vx * vx + vy * vy);
if (speed > maxSpeed) {
  velocity.x = (vx / speed) * maxSpeed;
  velocity.y = (vy / speed) * maxSpeed;
}
```

### Position Update

Finally, velocity is applied to position:

```typescript
position.x += velocity.x * deltaTime;
position.y += velocity.y * deltaTime;
```

## Example: Player Movement

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  createScheduler,
  LoopPhase,
  registerMovementSystem,
  setPosition,
  setVelocity,
  setAcceleration,
} from 'blecsd';

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
```

## Example: Smooth Scrolling

```typescript
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
  const vy = getVelocity(world, scrollContainer).y;
  setVelocity(world, scrollContainer, {
    ...getVelocity(world, scrollContainer),
    y: vy + deltaY * 5,
  });
}
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
