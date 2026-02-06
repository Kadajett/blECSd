# Lifecycle Events API

Node lifecycle events for tracking entity hierarchy changes. These events integrate with the event bubbling system and provide per-entity event buses for reparenting, adoption, attachment, detachment, removal, and destruction.

## Quick Start

```typescript
import { onReparent, onDestroy, createEventBus } from 'blecsd';

// Listen for reparent events on an entity
const unsub = onReparent(entity, (event) => {
  console.log(`Moved from ${event.oldParent} to ${event.newParent}`);
}, createEventBus);

// Listen for destruction
onDestroy(entity, (event) => {
  console.log(`Entity ${event.entity} was destroyed`);
}, createEventBus);
```

## Event Types

### ReparentEvent

Fired when an entity's parent changes.

```typescript
interface ReparentEvent {
  readonly entity: Entity;
  readonly oldParent: Entity;
  readonly newParent: Entity;
}
```

### AdoptEvent

Fired when a child is added to a parent.

```typescript
interface AdoptEvent {
  readonly parent: Entity;
  readonly child: Entity;
}
```

### AttachEvent

Fired when an entity is attached to the screen tree.

```typescript
interface AttachEvent {
  readonly entity: Entity;
  readonly screen: Entity;
}
```

### DetachEvent

Fired when an entity is detached from the screen tree.

```typescript
interface DetachEvent {
  readonly entity: Entity;
  readonly screen: Entity;
}
```

### RemoveEvent

Fired when a child is removed from a parent.

```typescript
interface RemoveEvent {
  readonly parent: Entity;
  readonly child: Entity;
}
```

### DestroyEvent

Fired when an entity is destroyed.

```typescript
interface DestroyEvent {
  readonly entity: Entity;
}
```

### LifecycleEventMap

Map of all lifecycle event names to their payload types.

```typescript
interface LifecycleEventMap {
  reparent: ReparentEvent;
  adopt: AdoptEvent;
  attach: AttachEvent;
  detach: DetachEvent;
  remove: RemoveEvent;
  destroy: DestroyEvent;
}
```

### LifecycleEventName

```typescript
type LifecycleEventName = keyof LifecycleEventMap;
```

### LifecycleEvent

```typescript
type LifecycleEvent = ReparentEvent | AdoptEvent | AttachEvent | DetachEvent | RemoveEvent | DestroyEvent;
```

## Event Bus Management

### getLifecycleEventBus

Gets or creates an event bus for an entity.

```typescript
function getLifecycleEventBus(
  entity: Entity,
  createEventBus: () => EventBus<LifecycleEventMap>
): EventBus<LifecycleEventMap>;
```

### removeLifecycleEventBus

Removes an entity's event bus. Called when entity is destroyed.

```typescript
function removeLifecycleEventBus(entity: Entity): void;
```

### clearLifecycleEventBuses

Clears all lifecycle event buses. Primarily used for testing.

```typescript
function clearLifecycleEventBuses(): void;
```

## Event Emitters

### emitReparent

```typescript
function emitReparent(bus: EventBus<LifecycleEventMap>, entity: Entity, oldParent: Entity, newParent: Entity): void;
```

### emitAdopt

```typescript
function emitAdopt(bus: EventBus<LifecycleEventMap>, parent: Entity, child: Entity): void;
```

### emitAttach

```typescript
function emitAttach(bus: EventBus<LifecycleEventMap>, entity: Entity, screen: Entity): void;
```

### emitDetach

```typescript
function emitDetach(bus: EventBus<LifecycleEventMap>, entity: Entity, screen: Entity): void;
```

### emitRemove

```typescript
function emitRemove(bus: EventBus<LifecycleEventMap>, parent: Entity, child: Entity): void;
```

### emitDestroy

```typescript
function emitDestroy(bus: EventBus<LifecycleEventMap>, entity: Entity): void;
```

## Event Listeners

Convenience functions that get or create an event bus and subscribe in one call. Each returns an unsubscribe function.

### onReparent

```typescript
function onReparent(
  entity: Entity,
  handler: (event: ReparentEvent) => void,
  createEventBus: () => EventBus<LifecycleEventMap>
): () => void;
```

### onAdopt

```typescript
function onAdopt(
  entity: Entity,
  handler: (event: AdoptEvent) => void,
  createEventBus: () => EventBus<LifecycleEventMap>
): () => void;
```

### onAttach

```typescript
function onAttach(
  entity: Entity,
  handler: (event: AttachEvent) => void,
  createEventBus: () => EventBus<LifecycleEventMap>
): () => void;
```

### onDetach

```typescript
function onDetach(
  entity: Entity,
  handler: (event: DetachEvent) => void,
  createEventBus: () => EventBus<LifecycleEventMap>
): () => void;
```

### onRemove

```typescript
function onRemove(
  entity: Entity,
  handler: (event: RemoveEvent) => void,
  createEventBus: () => EventBus<LifecycleEventMap>
): () => void;
```

### onDestroy

```typescript
function onDestroy(
  entity: Entity,
  handler: (event: DestroyEvent) => void,
  createEventBus: () => EventBus<LifecycleEventMap>
): () => void;
```

## Usage Example

```typescript
import {
  getLifecycleEventBus,
  emitReparent,
  emitAdopt,
  emitDestroy,
  onReparent,
  onDestroy,
  removeLifecycleEventBus,
  createEventBus,
} from 'blecsd';

// Subscribe to events on a widget
const unsub1 = onReparent(widgetEntity, (event) => {
  console.log(`Widget moved from parent ${event.oldParent} to ${event.newParent}`);
  invalidateLayout(event.entity);
}, createEventBus);

const unsub2 = onDestroy(widgetEntity, (event) => {
  cleanupResources(event.entity);
}, createEventBus);

// Emit events when hierarchy changes
function reparentEntity(entity: Entity, oldParent: Entity, newParent: Entity) {
  const bus = getLifecycleEventBus(entity, createEventBus);
  emitReparent(bus, entity, oldParent, newParent);

  const parentBus = getLifecycleEventBus(newParent, createEventBus);
  emitAdopt(parentBus, newParent, entity);
}

// Cleanup
function destroyEntity(entity: Entity) {
  const bus = getLifecycleEventBus(entity, createEventBus);
  emitDestroy(bus, entity);
  removeLifecycleEventBus(entity);
}

// Unsubscribe when done
unsub1();
unsub2();
```
