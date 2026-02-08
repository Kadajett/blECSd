# Event Bubbling API

Hierarchical event propagation system. Events bubble up from a target entity through its ancestors, following DOM-like event propagation semantics with stopPropagation, stopImmediatePropagation, and preventDefault.

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import { createBubbleableEvent, bubbleEvent, createEntityEventBusStore } from 'blecsd';

const store = createEntityEventBusStore<MyEvents>();
const bus = store.getOrCreate(buttonEntity, createBus);
bus.on('click', (e) => console.log('clicked!', e.payload));

const event = createBubbleableEvent({
  type: 'click',
  target: buttonEntity,
  payload: { x: 10, y: 20 },
});

const result = bubbleEvent(world, event, store.get);
if (!result.defaultPrevented) {
  // Perform default click behavior
}
```

## Types

### BubbleableEvent

An event that can bubble up through the entity hierarchy.

```typescript
interface BubbleableEvent<T = unknown> {
  readonly type: string;
  readonly target: Entity;
  currentTarget: Entity;
  readonly bubbles: boolean;
  defaultPrevented: boolean;
  propagationStopped: boolean;
  immediatePropagationStopped: boolean;
  readonly payload: T;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
  preventDefault(): void;
}
```

**Fields:**
- `type` - The event type name
- `target` - The entity where the event originated (stays fixed during bubbling)
- `currentTarget` - The entity currently handling the event (changes during bubbling)
- `bubbles` - Whether this event bubbles up through the hierarchy
- `payload` - The event payload data

**Methods:**
- `stopPropagation()` - Stops bubbling to parent entities; handlers on the current entity still fire
- `stopImmediatePropagation()` - Stops the event immediately; no more handlers fire
- `preventDefault()` - Prevents default behavior; does not stop propagation

### BubbleableEventOptions

```typescript
interface BubbleableEventOptions<T> {
  type: string;
  target: Entity;
  payload: T;
  bubbles?: boolean;  // default: true
}
```

### GetEntityEventBus

```typescript
type GetEntityEventBus<T extends EventMap> = (
  world: World,
  eid: Entity
) => EventBus<T> | undefined;
```

### BubbleResult

```typescript
interface BubbleResult {
  defaultPrevented: boolean;
  propagationStopped: boolean;
  dispatchCount: number;
}
```

## Functions

### createBubbleableEvent

Creates a new bubbleable event.

```typescript
function createBubbleableEvent<T>(options: BubbleableEventOptions<T>): BubbleableEvent<T>;
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { createBubbleableEvent } from 'blecsd';

const event = createBubbleableEvent({
  type: 'click',
  target: buttonEntity,
  payload: { x: 10, y: 20 },
  bubbles: true,
});
```

### bubbleEvent

Bubbles an event up through the entity hierarchy. At each entity, the event is emitted to that entity's EventBus. Bubbling stops when the root is reached, stopPropagation() is called, or bubbles is false.

```typescript
function bubbleEvent<T, E extends EventMap>(
  world: World,
  event: BubbleableEvent<T>,
  getEventBus: GetEntityEventBus<E>
): BubbleResult;
```

**Parameters:**
- `world` - The ECS world
- `event` - The bubbleable event to dispatch
- `getEventBus` - Function to get an entity's EventBus

**Returns:** Result with defaultPrevented, propagationStopped, and dispatchCount.

### createEntityEventBusStore

Creates a simple entity event bus store for managing entity-to-bus mappings.

```typescript
function createEntityEventBusStore<E extends EventMap>(): {
  get: GetEntityEventBus<E>;
  getOrCreate: (eid: Entity, createBus: () => EventBus<E>) => EventBus<E>;
  set: (eid: Entity, bus: EventBus<E>) => void;
  delete: (eid: Entity) => boolean;
  has: (eid: Entity) => boolean;
  clear: () => void;
};
```

## Usage Example

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createBubbleableEvent,
  bubbleEvent,
  createEntityEventBusStore,
} from 'blecsd';

// Define event types
interface UIEvents {
  click: BubbleableEvent<{ x: number; y: number }>;
  focus: BubbleableEvent<void>;
  keydown: BubbleableEvent<{ key: string }>;
}

// Create event bus store
const store = createEntityEventBusStore<UIEvents>();

// Attach handlers to entities
const buttonBus = store.getOrCreate(buttonEntity, createBus);
buttonBus.on('click', (event) => {
  console.log(`Button clicked at ${event.payload.x}, ${event.payload.y}`);
  // Prevent default if handled
  event.preventDefault();
});

const containerBus = store.getOrCreate(containerEntity, createBus);
containerBus.on('click', (event) => {
  console.log('Click bubbled to container');
  // This fires unless button called stopPropagation()
});

const rootBus = store.getOrCreate(rootEntity, createBus);
rootBus.on('click', (event) => {
  console.log('Click reached root');
});

// Dispatch an event
const clickEvent = createBubbleableEvent({
  type: 'click',
  target: buttonEntity,
  payload: { x: 10, y: 20 },
});

const result = bubbleEvent(world, clickEvent, store.get);
// result.dispatchCount = 3 (button, container, root)
// result.defaultPrevented = true (button called preventDefault)

// Cleanup
store.delete(buttonEntity);
store.clear();
```

---

## Downward Event Propagation

While `bubbleEvent` propagates events upward through parent entities, `emitDescendants` propagates events downward to all children and descendants.

### emitDescendants

Emits an event to an entity and all its descendants in the hierarchy. Traverses the entity tree depth-first, visiting each descendant entity. Safely handles circular references by tracking visited entities.

```typescript
function emitDescendants<T extends EventMap, K extends keyof T>(
  world: World,
  eid: Entity,
  eventName: K,
  eventData: T[K],
  getEventBus: GetEntityEventBus<T>,
  options?: EmitDescendantsOptions
): EmitDescendantsResult;
```

**Parameters:**
- `world` - The ECS world
- `eid` - The root entity to start emitting from
- `eventName` - The name of the event to emit
- `eventData` - The event data to pass to handlers
- `getEventBus` - Function to get the event bus for an entity
- `options` - Optional emission configuration

**Options:**
- `maxDepth?: number` - Maximum depth to traverse (default: Infinity)
- `includeRoot?: boolean` - Whether to include the root entity (default: true)

**Returns:** `EmitDescendantsResult` with:
- `dispatchCount: number` - Number of entities the event was dispatched to
- `maxDepth: number` - Maximum depth reached during traversal
- `circularReferenceDetected: boolean` - Whether a circular reference was detected

### Example: Broadcast to All Children

```typescript
import { emitDescendants, createEntityEventBusStore } from 'blecsd';

// Set up entity hierarchy
const parent = addEntity(world);
const child1 = addEntity(world);
const child2 = addEntity(world);
const grandchild = addEntity(world);

appendChild(world, parent, child1);
appendChild(world, parent, child2);
appendChild(world, child1, grandchild);

// Create event buses for entities
const store = createEntityEventBusStore();
store.set(world, parent, createEventBus());
store.set(world, child1, createEventBus());
store.set(world, child2, createEventBus());
store.set(world, grandchild, createEventBus());

// Listen for events
store.get(world, parent)!.on('action', (data) =>
  console.log('Parent:', data)
);
store.get(world, child1)!.on('action', (data) =>
  console.log('Child1:', data)
);
store.get(world, child2)!.on('action', (data) =>
  console.log('Child2:', data)
);
store.get(world, grandchild)!.on('action', (data) =>
  console.log('Grandchild:', data)
);

// Emit to all descendants
const result = emitDescendants(
  world,
  parent,
  'action',
  { type: 'activate' },
  (w, eid) => store.get(w, eid)
);

// Logs:
// "Parent: { type: 'activate' }"
// "Child1: { type: 'activate' }"
// "Child2: { type: 'activate' }"
// "Grandchild: { type: 'activate' }"

console.log(result);
// {
//   dispatchCount: 4,
//   maxDepth: 2,
//   circularReferenceDetected: false
// }
```

### Example: Exclude Root

```typescript
// Emit only to descendants, not the root
const result = emitDescendants(
  world,
  parent,
  'childOnly',
  { message: 'for children' },
  getEventBus,
  { includeRoot: false }
);

// Only children receive the event, not the parent
```

### Example: Limit Depth

```typescript
// Only emit to immediate children (depth 1)
const result = emitDescendants(
  world,
  parent,
  'action',
  { level: 'shallow' },
  getEventBus,
  { maxDepth: 1 }
);

// Grandchildren and deeper descendants won't receive the event
```

### Example: Circular Reference Detection

```typescript
// If entity hierarchy has a cycle (should not happen in correct usage)
const result = emitDescendants(
  world,
  entity,
  'test',
  {},
  getEventBus
);

if (result.circularReferenceDetected) {
  console.error('Circular reference detected in entity hierarchy!');
}
```

### Use Cases for emitDescendants

1. **Disable/Enable entire widget trees**
   ```typescript
   emitDescendants(world, container, 'disable', {}, getEventBus);
   ```

2. **Propagate theme changes**
   ```typescript
   emitDescendants(world, root, 'theme:changed', { theme: 'dark' }, getEventBus);
   ```

3. **Batch updates to nested components**
   ```typescript
   emitDescendants(world, panel, 'update', { timestamp: Date.now() }, getEventBus);
   ```

4. **Destroy entire widget hierarchies**
   ```typescript
   emitDescendants(world, dialog, 'destroy', {}, getEventBus);
   ```

### Comparison: bubbleEvent vs emitDescendants

| Feature | `bubbleEvent` | `emitDescendants` |
|---------|---------------|-------------------|
| Direction | Upward (child → parent) | Downward (parent → children) |
| Stops at | Root entity or stopPropagation() | Leaf entities or maxDepth |
| Use case | Click events, focus events | Theme changes, batch updates |
| DOM equivalent | Event bubbling | Event capturing (rarely used) |
| Circular detection | No (follows parent chain) | Yes (tracks visited entities) |

### createEntityEventBusStore

Helper for managing entity-to-EventBus mappings (works with both bubbling and descendants).

```typescript
function createEntityEventBusStore<T extends EventMap>(): EntityEventBusStore<T>;
```

**Returns:** Store with:
- `get(world, eid)` - Gets the event bus for an entity
- `set(world, eid, eventBus)` - Sets the event bus for an entity
- `has(world, eid)` - Checks if an entity has an event bus
- `delete(world, eid)` - Removes the event bus for an entity
- `clear()` - Clears all event buses

```typescript
import { createEntityEventBusStore, createEventBus } from 'blecsd';

const store = createEntityEventBusStore();
const eventBus = createEventBus();

store.set(world, entity, eventBus);
const retrieved = store.get(world, entity);

if (store.has(world, entity)) {
  store.delete(world, entity);
}

store.clear(); // Remove all
```

---

## Event Propagation Patterns

### Pattern 1: Bidirectional Communication

```typescript
// Child emits event that bubbles to parent
const clickEvent = createBubbleableEvent({
  type: 'click',
  target: button,
  payload: { value: 'submit' }
});
bubbleEvent(world, clickEvent, getEventBus);

// Parent responds by emitting to all children
emitDescendants(
  world,
  form,
  'validation:result',
  { valid: true },
  getEventBus
);
```

### Pattern 2: Hierarchical Updates

```typescript
// When parent state changes, notify all descendants
function updateTheme(root: Entity, theme: Theme) {
  emitDescendants(
    world,
    root,
    'theme:update',
    { theme },
    getEventBus
  );
}
```

### Pattern 3: Selective Propagation

```typescript
// Only propagate to specific depth
emitDescendants(
  world,
  panel,
  'refresh',
  {},
  getEventBus,
  { maxDepth: 2 }  // Only direct children and grandchildren
);
```

---

## See Also

- [Events API](/docs/api/events.md) - Core event bus documentation
- [Hierarchy Component](/docs/api/components/hierarchy.md) - Parent-child relationships
- [Core Concepts](../getting-started/concepts.md) - Event system overview
