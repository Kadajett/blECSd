# Events API

Type-safe event emitter for game events.

## createEventBus

Create an event bus with typed events.

```typescript
import { createEventBus } from 'blecsd';

interface GameEvents {
  'player:moved': { x: number; y: number };
  'enemy:killed': { id: number; score: number };
}

const events = createEventBus<GameEvents>();
```

## EventBus Methods

### on

Subscribe to an event.

```typescript
const unsubscribe = events.on('player:moved', (e) => {
  console.log(`Player at ${e.x}, ${e.y}`);
});

// Later: stop listening
unsubscribe();
```

**Parameters:**
- `event` - Event name
- `handler` - Callback function

**Returns:** Unsubscribe function

### once

Subscribe to an event once. Handler is removed after first call.

```typescript
events.once('game:over', (e) => {
  console.log(`Final score: ${e.score}`);
});
```

### emit

Emit an event to all listeners.

```typescript
const hadListeners = events.emit('player:moved', { x: 10, y: 5 });
// Returns true if any handlers were called
```

**Parameters:**
- `event` - Event name
- `payload` - Event data

**Returns:** `true` if any listeners were called

### off

Remove a specific listener.

```typescript
const handler = (e) => console.log(e);
events.on('click', handler);
events.off('click', handler);
```

### removeAllListeners

Remove all listeners for an event, or all events.

```typescript
events.removeAllListeners('click');  // Remove click listeners
events.removeAllListeners();          // Remove all listeners
```

### listenerCount

Get the number of listeners for an event.

```typescript
const count = events.listenerCount('error');
```

### eventNames

Get all event names that have listeners.

```typescript
const names = events.eventNames();
// ['player:moved', 'enemy:killed']
```

### hasListeners

Check if an event has any listeners.

```typescript
if (events.hasListeners('debug')) {
  events.emit('debug', { message: 'info' });
}
```

## Types

### EventHandler

```typescript
type EventHandler<T> = (event: T) => void;
```

### EventMap

Base constraint for event maps.

```typescript
type EventMap = Record<string, unknown>;
```

### Unsubscribe

```typescript
type Unsubscribe = () => void;
```

## Built-in Event Maps

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

Use prefixes to organize events:

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

### Cleanup

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

### Conditional Emit

Avoid emitting when no listeners exist:

```typescript
if (events.hasListeners('debug')) {
  events.emit('debug', { message: expensiveDebugInfo() });
}
```
