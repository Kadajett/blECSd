# Collision System

The collision system detects collisions between entities with Collider and Position components. It emits events for collision start/end and trigger enter/exit, supporting both solid colliders and trigger zones.

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
} from 'blecsd';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  createScheduler,
  LoopPhase,
  registerCollisionSystem,
  getCollisionEventBus,
  attachCollider,
  setPosition,
} from 'blecsd';

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
attachCollider(world, player, { width: 2, height: 2 });

const wall = addEntity(world);
setPosition(world, wall, 12, 10);
attachCollider(world, wall, { width: 1, height: 5 });
```

## Recommended Phase

Register in the **UPDATE** phase, after movement:

```typescript
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
const bus = getCollisionEventBus();

// Collision events
const unsub1 = bus.on('collisionStart', ({ entityA, entityB }) => {
  handleCollision(entityA, entityB);
});

const unsub2 = bus.on('collisionEnd', ({ entityA, entityB }) => {
  clearCollision(entityA, entityB);
});

// Trigger events
const unsub3 = bus.on('triggerEnter', ({ entityA, entityB }) => {
  enterZone(entityA, entityB);
});

const unsub4 = bus.on('triggerExit', ({ entityA, entityB }) => {
  exitZone(entityA, entityB);
});

// Cleanup
unsub1(); unsub2(); unsub3(); unsub4();
```

## Functions

### System Registration

```typescript
// Register with scheduler (convenience function)
registerCollisionSystem(scheduler, priority?);
// Default priority: 10 (after movement)

// Or create and register manually
const system = createCollisionSystem();
scheduler.registerSystem(LoopPhase.UPDATE, system, 10);

// Or use the system directly
collisionSystem(world);
```

### Query Functions

```typescript
// Query all entities with Collider
const colliders = queryColliders(world);

// Detect collisions manually
const pairs = detectCollisions(world);
// Returns: CollisionPair[]

// Get active collision pairs
const active = getActiveCollisions();
// Returns: ReadonlyMap<string, CollisionPair>

// Get active trigger pairs
const triggers = getActiveTriggers();
// Returns: ReadonlyMap<string, CollisionPair>
```

### Entity Queries

```typescript
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
// Returns: number[]

// Get all trigger zones containing entity
const zones = getTriggerZones(player);
// Returns: number[]

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
// Define layers
const LAYER_PLAYER = 1 << 0;  // 0b0001
const LAYER_ENEMY = 1 << 1;   // 0b0010
const LAYER_BULLET = 1 << 2;  // 0b0100
const LAYER_WALL = 1 << 3;    // 0b1000

// Player collides with enemies and walls
attachCollider(world, player, {
  width: 2,
  height: 2,
  layer: LAYER_PLAYER,
  mask: LAYER_ENEMY | LAYER_WALL,
});

// Enemy collides with player and bullets
attachCollider(world, enemy, {
  width: 2,
  height: 2,
  layer: LAYER_ENEMY,
  mask: LAYER_PLAYER | LAYER_BULLET,
});

// Bullet collides with enemies only
attachCollider(world, bullet, {
  width: 1,
  height: 1,
  layer: LAYER_BULLET,
  mask: LAYER_ENEMY,
});
```

## Trigger Zones

Trigger zones detect overlaps without blocking movement:

```typescript
// Create a trigger zone (door activation)
const doorTrigger = addEntity(world);
setPosition(world, doorTrigger, 20, 10);
attachCollider(world, doorTrigger, {
  width: 3,
  height: 1,
  isTrigger: true,
});

// Listen for trigger events
bus.on('triggerEnter', ({ entityA, entityB }) => {
  if (entityB === doorTrigger) {
    openDoor();
  }
});

bus.on('triggerExit', ({ entityA, entityB }) => {
  if (entityB === doorTrigger) {
    closeDoor();
  }
});
```

## Example: Platformer Collisions

```typescript
import {
  registerCollisionSystem,
  getCollisionEventBus,
  isColliding,
  getCollidingEntities,
} from 'blecsd';

const LAYER_PLAYER = 1;
const LAYER_GROUND = 2;
const LAYER_ENEMY = 4;
const LAYER_COIN = 8;

// Player
const player = addEntity(world);
attachCollider(world, player, {
  width: 2,
  height: 3,
  layer: LAYER_PLAYER,
  mask: LAYER_GROUND | LAYER_ENEMY | LAYER_COIN,
});

// Ground platform
const ground = addEntity(world);
attachCollider(world, ground, {
  width: 80,
  height: 1,
  layer: LAYER_GROUND,
  mask: LAYER_PLAYER | LAYER_ENEMY,
});

// Coin (trigger)
const coin = addEntity(world);
attachCollider(world, coin, {
  width: 1,
  height: 1,
  layer: LAYER_COIN,
  mask: LAYER_PLAYER,
  isTrigger: true,
});

// Handle collisions
const bus = getCollisionEventBus();

bus.on('collisionStart', ({ entityA, entityB }) => {
  // Check for enemy collision
  if (isEnemy(entityB)) {
    playerTakeDamage();
  }
});

bus.on('triggerEnter', ({ entityA, entityB }) => {
  // Check for coin collection
  if (isCoin(entityB)) {
    collectCoin(entityB);
    removeEntity(world, entityB);
  }
});
```

## Example: UI Hit Testing

```typescript
// Button with collision for clicks
const button = addEntity(world);
setPosition(world, button, 10, 5);
attachCollider(world, button, {
  width: 15,
  height: 3,
  isTrigger: true, // Non-blocking
});

// Cursor "entity" for hit testing
const cursor = addEntity(world);
attachCollider(world, cursor, {
  width: 1,
  height: 1,
  isTrigger: true,
});

// Update cursor position on mouse move
function onMouseMove(x: number, y: number) {
  setPosition(world, cursor, x, y);
}

// Check what cursor is over
function getHoveredButton(): number | null {
  const zones = getTriggerZones(cursor);
  return zones.find(isButton) ?? null;
}
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
