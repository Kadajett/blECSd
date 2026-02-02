# Events API

Type-safe event emitter for decoupling application systems. Events let systems communicate without direct dependencies on each other.

## How do I create an event bus?

### createEventBus

```typescript
import { createEventBus } from 'blecsd';

interface AppEvents {
  'panel:resized': { width: number; height: number };
  'file:selected': { path: string; name: string };
}

const events = createEventBus<AppEvents>();
```

---

## How do I subscribe to events?

### on

Subscribe to an event. Returns an unsubscribe function.

```typescript
const unsubscribe = events.on('player:moved', (e) => {
  console.log(`Player at ${e.x}, ${e.y}`);
});

// Later: stop listening
unsubscribe();
```

**Parameters:** `event` (event name), `handler` (callback function)

**Returns:** Unsubscribe function

### once

Subscribe to an event once. Handler is removed after first call.

```typescript
events.once('game:over', (e) => {
  console.log(`Final score: ${e.score}`);
});
```

---

## How do I emit events?

### emit

Emit an event to all listeners.

```typescript
const hadListeners = events.emit('player:moved', { x: 10, y: 5 });
// Returns true if any handlers were called
```

**Parameters:** `event` (event name), `payload` (event data)

**Returns:** `true` if any listeners were called

---

## How do I unsubscribe?

### off

Remove a specific listener.

```typescript
const handler = (e) => console.log(e);
events.on('click', handler);
events.off('click', handler);
```

### removeAllListeners

Remove all listeners for an event, or all listeners for all events.

```typescript
events.removeAllListeners('click');  // Remove click listeners
events.removeAllListeners();          // Remove all listeners
```

---

## How do I check listener state?

### listenerCount

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

```typescript
if (events.hasListeners('debug')) {
  events.emit('debug', { message: 'info' });
}
```

---

## Types

### EventHandler

```typescript
type EventHandler<T> = (event: T) => void;
```

### EventMap

```typescript
type EventMap = Record<string, unknown>;
```

### Unsubscribe

```typescript
type Unsubscribe = () => void;
```

---

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

---

## Common Patterns

### Scoped Events

Use prefixes to organize events:

```typescript
interface AppEvents {
  'file:open': { path: string };
  'file:save': { path: string; content: string };
  'file:close': { path: string };
  'panel:focus': { panelId: string };
  'panel:resize': { panelId: string; width: number; height: number };
  'ui:modal:open': { modalId: string };
  'ui:modal:close': { modalId: string };
  'ui:toast:show': { message: string; type: 'info' | 'error' | 'success' };
}
```

### Cleanup

Always clean up listeners to prevent memory leaks:

```typescript
function createGameSystem(events) {
  const unsubscribers = [];

  function init() {
    unsubscribers.push(
      events.on('player:moved', handleMove),
      events.on('game:over', handleGameOver)
    );
  }

  function destroy() {
    for (const unsub of unsubscribers) {
      unsub();
    }
    unsubscribers.length = 0;
  }

  return { init, destroy };
}
```

### Conditional Emit

Skip expensive work when no listeners exist:

```typescript
if (events.hasListeners('debug')) {
  events.emit('debug', { message: expensiveDebugInfo() });
}
```

---

## See Also

- [Core Concepts](../getting-started/concepts.md) - Event bus overview
