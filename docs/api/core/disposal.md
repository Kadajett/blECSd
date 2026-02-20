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
import { createWorld, addEntity } from 'blecsd/core';
import {
  destroyEntity,
  destroyAllChildren,
  flushDestroyQueue,
  registerCleanupCallback,
} from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
const myCustomStore = new Map<number, unknown>();

// Register cleanup for your custom stores
registerCleanupCallback((_w, eid) => {
  myCustomStore.delete(eid);
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
import { createWorld, addEntity } from 'blecsd/core';
import { destroyEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
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
import { createWorld, addEntity } from 'blecsd/core';
import { destroyAllChildren } from 'blecsd/core';

const world = createWorld();
const container = addEntity(world);
// Clear all children from container
destroyAllChildren(world, container);

// Immediate destruction of children
destroyAllChildren(world, container, { immediate: true });
```

### destroyWorld

Clears all disposal state for a world.

```typescript
import { createWorld } from 'blecsd/core';
import { destroyWorld } from 'blecsd/core';

const world = createWorld();
destroyWorld(world);
```

## Queue Management

### flushDestroyQueue

Processes all pending destructions. Call at end of frame.

```typescript
import { createWorld } from 'blecsd/core';
import { flushDestroyQueue } from 'blecsd/core';

const world = createWorld();
// In POST_RENDER phase:
const destroyedCount = flushDestroyQueue(world);
console.log(`Destroyed ${destroyedCount} entities`);
```

### isMarkedForDestruction

Checks if an entity is queued for destruction.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { isMarkedForDestruction } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
if (isMarkedForDestruction(entity)) {
  // Skip processing this entity
}
```

### getDestroyQueueSize

Gets number of entities pending destruction.

```typescript
import { createWorld } from 'blecsd/core';
import { getDestroyQueueSize } from 'blecsd/core';

const world = createWorld();
// For specific world
const count = getDestroyQueueSize(world);

// Global count
const globalCount = getDestroyQueueSize();
```

### clearDestroyQueue

Cancels pending destructions without destroying.

```typescript
import { createWorld } from 'blecsd/core';
import { clearDestroyQueue } from 'blecsd/core';

const world = createWorld();
// Cancel all pending destructions
clearDestroyQueue(world);
```

## Cleanup Callbacks

### registerCleanupCallback

Registers cleanup logic for entity destruction.

```typescript
import { registerCleanupCallback } from 'blecsd/core';

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
import { clearCleanupCallbacks } from 'blecsd/core';

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
import { createWorld, addEntity } from 'blecsd/core';
import { registerCleanupCallback } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);

// Listen for destruction via cleanup callbacks
registerCleanupCallback((_w, eid) => {
  console.log(`Entity ${eid} being destroyed`);
});
```

## Best Practices

1. **Use deferred destruction** - Prevents issues during iteration
2. **Flush at frame end** - Call `flushDestroyQueue` in POST_RENDER
3. **Register store cleanup** - Use `registerCleanupCallback` for custom stores
4. **Check before accessing** - Use `isMarkedForDestruction` to skip doomed entities

## Integration with Game Loop

```typescript
import { createWorld } from 'blecsd/core';
import { flushDestroyQueue } from 'blecsd/core';

const world = createWorld();

// Call flushDestroyQueue in POST_RENDER phase each frame
function postRender(w: typeof world): typeof world {
  flushDestroyQueue(w);
  return w;
}
postRender(world);
```

## Example: Complete Cleanup

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { destroyEntity, flushDestroyQueue, registerCleanupCallback } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
const contentStore = new Map<number, unknown>();
const spriteStore = new Map<number, unknown>();

// Setup cleanup for all stores
registerCleanupCallback((_w, eid) => {
  contentStore.delete(eid);
  spriteStore.delete(eid);
});

// Queue entity for destruction
destroyEntity(world, entity);

// At end of frame, flush the queue
flushDestroyQueue(world);
```
