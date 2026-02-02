# Entity Disposal API

Proper cleanup and destruction of entities with deferred processing.

## Overview

The disposal system handles entity destruction with:
- Deferred destruction (queue for end of frame)
- Automatic child destruction
- Lifecycle event emission
- Custom cleanup callbacks
- Hierarchy cleanup

## Quick Start

```typescript
import {
  destroyEntity,
  destroyAllChildren,
  flushDestroyQueue,
  registerCleanupCallback,
} from 'blecsd';

// Register cleanup for your custom stores
registerCleanupCallback((world, entity) => {
  myCustomStore.delete(entity);
});

// Queue entity for destruction (deferred)
destroyEntity(world, entity);

// At end of frame, process destructions
flushDestroyQueue(world);
```

## Destruction Functions

### destroyEntity

Marks an entity for destruction.

```typescript
import { destroyEntity } from 'blecsd';

// Deferred destruction (recommended)
destroyEntity(world, entity);

// Immediate destruction
destroyEntity(world, entity, { immediate: true });

// Don't destroy children
destroyEntity(world, entity, { destroyChildren: false });

// Skip destroy event
destroyEntity(world, entity, { emitEvent: false });
```

**Parameters:**
- `world` - The ECS world
- `entity` - Entity to destroy
- `options` - Destruction options:
  - `immediate` - Destroy now instead of deferring (default: false)
  - `destroyChildren` - Also destroy children (default: true)
  - `emitEvent` - Emit destroy lifecycle event (default: true)

### destroyAllChildren

Destroys all children without destroying the parent.

```typescript
import { destroyAllChildren } from 'blecsd';

// Clear all children from container
destroyAllChildren(world, container);

// Immediate destruction of children
destroyAllChildren(world, container, { immediate: true });
```

### destroyWorld

Clears all disposal state for a world.

```typescript
import { destroyWorld } from 'blecsd';

destroyWorld(world);
```

## Queue Management

### flushDestroyQueue

Processes all pending destructions. Call at end of frame.

```typescript
import { flushDestroyQueue } from 'blecsd';

// In POST_RENDER phase:
const destroyedCount = flushDestroyQueue(world);
console.log(`Destroyed ${destroyedCount} entities`);
```

### isMarkedForDestruction

Checks if an entity is queued for destruction.

```typescript
import { isMarkedForDestruction } from 'blecsd';

if (isMarkedForDestruction(entity)) {
  // Skip processing this entity
}
```

### getDestroyQueueSize

Gets number of entities pending destruction.

```typescript
import { getDestroyQueueSize } from 'blecsd';

// For specific world
const count = getDestroyQueueSize(world);

// Global count
const globalCount = getDestroyQueueSize();
```

### clearDestroyQueue

Cancels pending destructions without destroying.

```typescript
import { clearDestroyQueue } from 'blecsd';

// Cancel all pending destructions
clearDestroyQueue(world);
```

## Cleanup Callbacks

### registerCleanupCallback

Registers cleanup logic for entity destruction.

```typescript
import { registerCleanupCallback } from 'blecsd';

// Register cleanup for custom store
const unregister = registerCleanupCallback((world, entity) => {
  spriteStore.delete(entity);
  contentStore.delete(entity);
});

// Later, unregister if needed
unregister();
```

### clearCleanupCallbacks

Removes all cleanup callbacks (for testing).

```typescript
import { clearCleanupCallbacks } from 'blecsd';

clearCleanupCallbacks();
```

## Types

### DestroyOptions

```typescript
interface DestroyOptions {
  /** Destroy immediately instead of deferring */
  immediate?: boolean;
  /** Also destroy children (default: true) */
  destroyChildren?: boolean;
  /** Emit destroy event (default: true) */
  emitEvent?: boolean;
}
```

### CleanupCallback

```typescript
type CleanupCallback = (world: World, entity: Entity) => void;
```

## Lifecycle Events

Destruction emits a `destroy` event that can be listened to:

```typescript
import { getLifecycleEventBus, createEventBus } from 'blecsd';

const bus = getLifecycleEventBus(entity, createEventBus);
bus.on('destroy', (event) => {
  console.log(`Entity ${event.entity} being destroyed`);
});
```

## Best Practices

1. **Use deferred destruction** - Prevents issues during iteration
2. **Flush at frame end** - Call `flushDestroyQueue` in POST_RENDER
3. **Register store cleanup** - Use `registerCleanupCallback` for custom stores
4. **Check before accessing** - Use `isMarkedForDestruction` to skip doomed entities

## Integration with Game Loop

```typescript
import { createGameLoop, LoopPhase, flushDestroyQueue } from 'blecsd';

const loop = createGameLoop(world, { targetFPS: 60 });

// Register cleanup system in POST_RENDER
loop.registerSystem(LoopPhase.POST_RENDER, (w) => {
  flushDestroyQueue(w);
  return w;
});
```

## Example: Complete Cleanup

```typescript
import {
  destroyEntity,
  flushDestroyQueue,
  registerCleanupCallback,
} from 'blecsd';

// Setup cleanup for all stores
registerCleanupCallback((world, entity) => {
  contentStore.delete(entity);
  spriteStore.delete(entity);
  animationStore.delete(entity);
});

// In game logic
function handleEntityDeath(world: World, entity: Entity): void {
  // Play death animation, then destroy
  playAnimation(world, entity, 'death').then(() => {
    destroyEntity(world, entity);
  });
}

// In game loop
function postRender(world: World): World {
  flushDestroyQueue(world);
  return world;
}
```
