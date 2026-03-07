# Collision System

The collision system detects collisions between entities with Collider and Position components. It emits events for collision start/end and trigger enter/exit, supporting both solid colliders and trigger zones.

> **Note**: For most applications, use [`createApp()`](../app.md) for application setup. You'll need to manually register the collision system if you're using it.

## Import

```typescript
import {
  collisionSystem,
  createCollisionSystem,
  registerCollisionSystem,
  queryColliders,
  detectCollisions,
  getCollisionEventBus,
  getActiveCollisions,
  getActiveTriggers,
  resetCollisionState,
  isColliding,
  isInTrigger,
  getCollidingEntities,
  getTriggerZones,
  areColliding,
} from 'blecsd/systems';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setCollider } from 'blecsd/components';
import { createScheduler, LoopPhase } from 'blecsd/core';
import { registerCollisionSystem, getCollisionEventBus } from 'blecsd/systems';
import { setPosition } from 'blecsd/components';

const world = createWorld();
const scheduler = createScheduler();

// Register the collision system
registerCollisionSystem(scheduler);

// Listen for collisions
const bus = getCollisionEventBus();
bus.on('collisionStart', ({ entityA, entityB }) => {
  console.log(`Collision: ${entityA} hit ${entityB}`);
});

// Create colliding entities
const player = addEntity(world);
setPosition(world, player, 10, 10);
setCollider(world, player, { width: 2, height: 2 });

const wall = addEntity(world);
setPosition(world, wall, 12, 10);
setCollider(world, wall, { width: 1, height: 5 });
```

## Recommended Phase

Register in the **UPDATE** phase, after movement:

```typescript
import { createScheduler, LoopPhase } from 'blecsd/core';
import { collisionSystem } from 'blecsd/systems';

const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.UPDATE, collisionSystem, 10);
// Priority 10 ensures it runs after movement (priority 0)
```

## System Behavior

Each frame, the collision system:

1. Queries all entities with Collider component
2. Tests collision pairs using O(n²) broad phase
3. Filters by collision layers/masks
4. Tracks collision state changes (enter/exit)
5. Emits appropriate events

## Collision Events

```typescript
interface CollisionEventMap {
  /** Two solid colliders started colliding */
  collisionStart: { entityA: number; entityB: number };

  /** Two solid colliders stopped colliding */
  collisionEnd: { entityA: number; entityB: number };

  /** Entity entered a trigger zone */
  triggerEnter: { entityA: number; entityB: number };

  /** Entity exited a trigger zone */
  triggerExit: { entityA: number; entityB: number };
}
```

### Subscribing to Events

```typescript
import { getCollisionEventBus } from 'blecsd/systems';

const bus = getCollisionEventBus();

// Collision events
const unsub1 = bus.on('collisionStart', ({ entityA, entityB }) => {
  console.log(`Collision start: ${entityA} and ${entityB}`);
});

const unsub2 = bus.on('collisionEnd', ({ entityA, entityB }) => {
  console.log(`Collision end: ${entityA} and ${entityB}`);
});

// Trigger events
const unsub3 = bus.on('triggerEnter', ({ entityA, entityB }) => {
  console.log(`Trigger enter: ${entityA} entered ${entityB}`);
});

const unsub4 = bus.on('triggerExit', ({ entityA, entityB }) => {
  console.log(`Trigger exit: ${entityA} exited ${entityB}`);
});

// Cleanup
unsub1(); unsub2(); unsub3(); unsub4();
```

## Functions

### System Registration

```typescript
import { createWorld } from 'blecsd/core';
import { createScheduler, LoopPhase } from 'blecsd/core';
import { collisionSystem, createCollisionSystem, registerCollisionSystem } from 'blecsd/systems';

const world = createWorld();
const scheduler = createScheduler();

// Register with scheduler (convenience function)
registerCollisionSystem(scheduler);
// Default priority: 10 (after movement)

// Or create and register manually
const system = createCollisionSystem();
scheduler.registerSystem(LoopPhase.UPDATE, system, 10);

// Or use the system directly
collisionSystem(world);
```

### Query Functions

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  queryColliders, detectCollisions, getActiveCollisions, getActiveTriggers,
  isColliding, isInTrigger, getCollidingEntities, getTriggerZones, areColliding,
} from 'blecsd/systems';

const world = createWorld();
const player = addEntity(world);
const enemy = addEntity(world);

// Query all entities with Collider
const colliders = queryColliders(world);
console.log(`${colliders.length} colliders`);

// Detect collisions manually
const pairs = detectCollisions(world);
console.log(`${pairs.length} collision pairs`);

// Get active collision pairs
const active = getActiveCollisions();
console.log(`${active.size} active collisions`);

// Get active trigger pairs
const triggers = getActiveTriggers();
console.log(`${triggers.size} active triggers`);
```

### Entity Queries

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { isColliding, isInTrigger, getCollidingEntities, getTriggerZones, areColliding } from 'blecsd/systems';

const world = createWorld();
const player = addEntity(world);
const enemy = addEntity(world);

// Is entity colliding with anything?
if (isColliding(player)) {
  // Player is touching something
}

// Is entity in any trigger zone?
if (isInTrigger(player)) {
  // Player is in a zone
}

// Get all entities colliding with this one
const touching = getCollidingEntities(player);
console.log(`Touching ${touching.length} entities`);

// Get all trigger zones containing entity
const zones = getTriggerZones(player);
console.log(`In ${zones.length} trigger zones`);

// Are two specific entities colliding?
if (areColliding(player, enemy)) {
  // Handle player-enemy collision
}
```

### State Management

```typescript
// Reset collision state (useful for scene changes)
resetCollisionState();
```

## Collision Layers

Use layers and masks to control which entities can collide:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setCollider } from 'blecsd/components';

const world = createWorld();
const player = addEntity(world);
const enemy = addEntity(world);
const bullet = addEntity(world);

// Define layers
const LAYER_PLAYER = 1 << 0;  // 0b0001
const LAYER_ENEMY = 1 << 1;   // 0b0010
const LAYER_BULLET = 1 << 2;  // 0b0100
const LAYER_WALL = 1 << 3;    // 0b1000

// Player collides with enemies and walls
setCollider(world, player, {
  width: 2,
  height: 2,
  layer: LAYER_PLAYER,
  mask: LAYER_ENEMY | LAYER_WALL,
});

// Enemy collides with player and bullets
setCollider(world, enemy, {
  width: 2,
  height: 2,
  layer: LAYER_ENEMY,
  mask: LAYER_PLAYER | LAYER_BULLET,
});

// Bullet collides with enemies only
setCollider(world, bullet, {
  width: 1,
  height: 1,
  layer: LAYER_BULLET,
  mask: LAYER_ENEMY,
});
```

## Trigger Zones

Trigger zones detect overlaps without blocking movement:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setCollider, setPosition } from 'blecsd/components';
import { getCollisionEventBus } from 'blecsd/systems';

const world = createWorld();
const bus = getCollisionEventBus();

// Create a trigger zone (door activation)
const doorTrigger = addEntity(world);
setPosition(world, doorTrigger, 20, 10);
setCollider(world, doorTrigger, {
  width: 3,
  height: 1,
  isTrigger: true,
});

let doorOpen = false;

// Listen for trigger events
bus.on('triggerEnter', ({ entityA, entityB }) => {
  if (entityB === doorTrigger) {
    doorOpen = true;
    console.log(`Entity ${entityA} opened the door`);
  }
});

bus.on('triggerExit', ({ entityA, entityB }) => {
  if (entityB === doorTrigger) {
    doorOpen = false;
    console.log(`Entity ${entityA} left the door area`);
  }
});

console.log(doorOpen);
```

## Example: Platformer Collisions

```typescript
import { createWorld, addEntity, removeEntity } from 'blecsd/core';
import { setCollider } from 'blecsd/components';
import {
  registerCollisionSystem,
  getCollisionEventBus,
  isColliding,
} from 'blecsd/systems';
import { createScheduler } from 'blecsd/core';

const world = createWorld();
const scheduler = createScheduler();
registerCollisionSystem(scheduler);

const LAYER_PLAYER = 1;
const LAYER_GROUND = 2;
const LAYER_ENEMY = 4;
const LAYER_COIN = 8;

// Player
const player = addEntity(world);
setCollider(world, player, {
  width: 2,
  height: 3,
  layer: LAYER_PLAYER,
  mask: LAYER_GROUND | LAYER_ENEMY | LAYER_COIN,
});

// Ground platform
const ground = addEntity(world);
setCollider(world, ground, {
  width: 80,
  height: 1,
  layer: LAYER_GROUND,
  mask: LAYER_PLAYER | LAYER_ENEMY,
});

// Coin (trigger)
const coin = addEntity(world);
setCollider(world, coin, {
  width: 1,
  height: 1,
  layer: LAYER_COIN,
  mask: LAYER_PLAYER,
  isTrigger: true,
});

console.log(isColliding(player));

// Handle collisions
const bus = getCollisionEventBus();
const enemyEntities = new Set<number>();
const coinEntities = new Set<number>([coin]);

bus.on('collisionStart', ({ entityA, entityB }) => {
  // Check for enemy collision
  if (enemyEntities.has(entityB)) {
    console.log(`Entity ${entityA} took damage from enemy ${entityB}`);
  }
});

bus.on('triggerEnter', ({ entityA, entityB }) => {
  // Check for coin collection
  if (coinEntities.has(entityB)) {
    console.log(`Entity ${entityA} collected coin ${entityB}`);
    coinEntities.delete(entityB);
    removeEntity(world, entityB);
  }
});

console.log(ground);
```

## Example: UI Hit Testing

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, setCollider } from 'blecsd/components';
import { getTriggerZones } from 'blecsd/systems';

const world = createWorld();

// Button with collision for clicks
const button = addEntity(world);
setPosition(world, button, 10, 5);
setCollider(world, button, {
  width: 15,
  height: 3,
  isTrigger: true, // Non-blocking
});

// Cursor "entity" for hit testing
const cursor = addEntity(world);
setCollider(world, cursor, {
  width: 1,
  height: 1,
  isTrigger: true,
});

const buttonEntities = new Set<number>([button]);

// Update cursor position on mouse move
const onMouseMove = (x: number, y: number): void => {
  setPosition(world, cursor, x, y);
};

// Check what cursor is over
const getHoveredButton = (): number | null => {
  const zones = getTriggerZones(cursor);
  return zones.find(id => buttonEntities.has(id)) ?? null;
};

onMouseMove(10, 5);
console.log(getHoveredButton());
```

## Performance Considerations

- Uses O(n²) broad phase (suitable for small entity counts <1000)
- Consider spatial partitioning for large entity counts
- Collision pairs are tracked to detect enter/exit
- Layer/mask filtering reduces actual collision tests

## Related

- [Movement System](./movementSystem.md) - Velocity-based movement
- [Drag System](./dragSystem.md) - Drag and drop
- [Input System](./input-system.md) - Hit testing
