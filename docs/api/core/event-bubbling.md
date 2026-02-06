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
