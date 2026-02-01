# Events API

Type-safe event emitter for game events.

## Quick Start

```typescript
import { createEventBus } from 'blecsd';

interface GameEvents {
  'player:moved': { x: number; y: number };
  'game:over': { score: number };
}

const events = createEventBus<GameEvents>();

// Subscribe to events
const unsubscribe = events.on('player:moved', (e) => {
  console.log(`Player at ${e.x}, ${e.y}`);
});

// Emit events
events.emit('player:moved', { x: 10, y: 20 });

// Unsubscribe when done
unsubscribe();
```

## Functions

### createEventBus()

Create a new type-safe event bus.

```typescript
function createEventBus<T extends EventMap>(): EventBus<T>
```

**Type Parameters:**
- `T` - Event map defining event names and payload types

**Returns:** A new `EventBus` instance

**Example:**
```typescript
interface MyEvents {
  'enemy:spawn': { type: string; x: number; y: number };
  'player:death': { cause: string };
}

const events = createEventBus<MyEvents>();
```

## Classes

### EventBus

Type-safe event emitter class.

#### Constructor

```typescript
new EventBus<T extends EventMap>()
```

While you can use the constructor directly, prefer `createEventBus()` for consistency.

#### Methods

##### on()

Register an event listener.

```typescript
on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): Unsubscribe
```

**Parameters:**
- `event` - The event name to listen for
- `handler` - Function called when event is emitted

**Returns:** Unsubscribe function to remove the listener

**Example:**
```typescript
const unsubscribe = events.on('resize', ({ width, height }) => {
  console.log(`New size: ${width}x${height}`);
});

// Later, stop listening
unsubscribe();
```

##### once()

Register a one-time listener. Automatically removed after first call.

```typescript
once<K extends keyof T>(event: K, handler: EventHandler<T[K]>): Unsubscribe
```

**Parameters:**
- `event` - The event name to listen for
- `handler` - Function called when event is emitted

**Returns:** Unsubscribe function (can cancel before it fires)

**Example:**
```typescript
events.once('game:over', ({ score }) => {
  console.log(`Final score: ${score}`);
});
```

##### off()

Remove a specific listener.

```typescript
off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): this
```

**Parameters:**
- `event` - The event name
- `handler` - The handler function to remove

**Returns:** The EventBus for chaining

**Example:**
```typescript
const handler = (e) => console.log(e);
events.on('click', handler);
// Later:
events.off('click', handler);
```

##### emit()

Emit an event to all listeners.

```typescript
emit<K extends keyof T>(event: K, payload: T[K]): boolean
```

**Parameters:**
- `event` - The event name to emit
- `payload` - The event data

**Returns:** `true` if any listeners were called, `false` otherwise

**Example:**
```typescript
const hadListeners = events.emit('player:moved', { x: 5, y: 10 });
if (!hadListeners) {
  console.log('No one is listening for player movement');
}
```

##### removeAllListeners()

Remove all listeners for an event or all events.

```typescript
removeAllListeners<K extends keyof T>(event?: K): this
```

**Parameters:**
- `event` - Optional event name. If omitted, removes all listeners.

**Returns:** The EventBus for chaining

**Example:**
```typescript
events.removeAllListeners('click'); // Remove click listeners only
events.removeAllListeners(); // Remove all listeners
```

##### listenerCount()

Get the number of listeners for an event.

```typescript
listenerCount<K extends keyof T>(event: K): number
```

**Example:**
```typescript
if (events.listenerCount('error') === 0) {
  console.warn('No error handlers registered');
}
```

##### eventNames()

Get all event names that have listeners.

```typescript
eventNames(): Array<keyof T>
```

**Example:**
```typescript
console.log('Active events:', events.eventNames());
```

##### hasListeners()

Check if an event has any listeners.

```typescript
hasListeners<K extends keyof T>(event: K): boolean
```

**Example:**
```typescript
if (events.hasListeners('debug')) {
  events.emit('debug', { message: 'Detailed info' });
}
```

## Types

### EventHandler

Function signature for event handlers.

```typescript
type EventHandler<T> = (event: T) => void
```

### EventMap

Base type constraint for event maps.

```typescript
type EventMap = Record<string, any>
```

Any interface with string keys satisfies this constraint:

```typescript
interface MyEvents {
  'player:moved': { x: number; y: number };
  'game:over': { score: number };
}
```

### UIEventMap

Standard UI events for interactive elements.

```typescript
interface UIEventMap {
  click: { x: number; y: number; button: number };
  keypress: { key: string; ctrl: boolean; meta: boolean; shift: boolean };
  focus: { target: unknown };
  blur: { target: unknown };
  mouseenter: { x: number; y: number };
  mouseleave: { x: number; y: number };
  mousemove: { x: number; y: number };
  mousedown: { x: number; y: number; button: number };
  mouseup: { x: number; y: number; button: number };
  scroll: { direction: 'up' | 'down'; amount: number };
}
```

### ScreenEventMap

Screen-level events.

```typescript
interface ScreenEventMap {
  resize: { width: number; height: number };
  render: { frameTime: number };
  destroy: Record<string, never>;
}
```

## Patterns

### Scoped Events

Use event prefixes to organize events by system:

```typescript
interface GameEvents {
  'player:spawn': { id: string };
  'player:death': { id: string; cause: string };
  'enemy:spawn': { type: string; x: number; y: number };
  'enemy:death': { id: string };
  'ui:menu:open': { menuId: string };
  'ui:menu:close': { menuId: string };
}
```

### Cleanup Pattern

Always clean up listeners to prevent memory leaks:

```typescript
class GameSystem {
  private unsubscribers: Unsubscribe[] = [];

  init(events: EventBus<GameEvents>) {
    this.unsubscribers.push(
      events.on('player:moved', this.handleMove),
      events.on('game:over', this.handleGameOver)
    );
  }

  destroy() {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }
}
```

### Event Debugging

Log all events for debugging:

```typescript
// Development only
const originalEmit = events.emit.bind(events);
events.emit = (event, payload) => {
  console.log(`[EVENT] ${String(event)}:`, payload);
  return originalEmit(event, payload);
};
```

## See Also

- [ECS Basics Guide](../guides/ecs-basics.md)
- [Input Handling Guide](../guides/input-handling.md)
