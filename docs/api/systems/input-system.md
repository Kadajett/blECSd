# Input System API

ECS system for processing keyboard and mouse events with hit testing and focus management.

## Overview

The input system handles:
- Queuing and processing keyboard/mouse events
- Hit testing to determine which entity is under the mouse
- Focus management (click to focus, Tab navigation)
- Hover and pressed state updates
- Dispatching UI events to an event bus

## Quick Start

```typescript
import { createWorld, createScheduler } from 'blecsd/core';
import {
  registerInputSystem,
  queueKeyEvent,
  queueMouseEvent,
  getInputEventBus,
} from 'blecsd/systems';

const world = createWorld();
const scheduler = createScheduler();
registerInputSystem(scheduler);

// Subscribe to events
getInputEventBus().on('click', (e) => {
  console.log(`Clicked at ${e.x}, ${e.y}`);
});

// In your input handler (e.g., from InputHandler):
// inputHandler.onKey((event) => queueKeyEvent(event));
// inputHandler.onMouse((event) => queueMouseEvent(event));

// In game loop
const deltaTime = 1 / 60;
scheduler.run(world, deltaTime);
```

## Event Queuing

### queueKeyEvent

Queue a keyboard event for processing on the next frame.

```typescript
import { queueKeyEvent } from 'blecsd/systems';

queueKeyEvent({
  name: 'a',
  ctrl: false,
  meta: false,
  shift: false,
  raw: 'a'
});
```

### queueMouseEvent

Queue a mouse event for processing on the next frame.

```typescript
import { queueMouseEvent } from 'blecsd/systems';

queueMouseEvent({
  x: 10,
  y: 5,
  button: 'left',
  action: 'press',
  raw: ''
});
```

### getEventQueue

Get the current event queue (for debugging).

```typescript
import { getEventQueue } from 'blecsd/systems';

const queue = getEventQueue();
console.log(`${queue.length} events pending`);
```

### clearEventQueue

Clear all pending events.

```typescript
import { clearEventQueue } from 'blecsd/systems';

clearEventQueue();
```

## Hit Testing

### hitTest

Find all entities at a screen position, sorted by z-index.

```typescript
import { createWorld } from 'blecsd/core';
import { hitTest } from 'blecsd/core';

const world = createWorld();
const mouseX = 10;
const mouseY = 5;
const hits = hitTest(world, mouseX, mouseY);
if (hits && hits.length > 0) {
  const topEntity = hits[0].entity;
  const localX = hits[0].localX;
  const localY = hits[0].localY;
  console.log('hit entity:', topEntity, 'at local coords', localX, localY);
}
```

**Returns:** `HitTestResult[]`
- `entity` - The entity ID
- `localX` - X coordinate relative to entity
- `localY` - Y coordinate relative to entity
- `zIndex` - Entity's z-index

### pointInEntity

Test if a point is inside an entity's bounds.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { pointInEntity } from 'blecsd/systems';

const world = createWorld();
const entity = addEntity(world);
const x = 5;
const y = 3;
if (pointInEntity(world, entity, x, y)) {
  console.log('Point is inside entity');
}
```

### getInteractiveEntityAt

Get the topmost interactive entity at a position.

```typescript
import { createWorld } from 'blecsd/core';
import { getInteractiveEntityAt } from 'blecsd/systems';

const world = createWorld();
const x = 5;
const y = 3;
const entity = getInteractiveEntityAt(world, x, y);
if (entity !== null) {
  // Handle interaction with entity
}
```

## Mouse Capture

Capture directs all mouse events to a specific entity (for drag operations).

### captureMouseTo

Start capturing mouse events to an entity.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { captureMouseTo } from 'blecsd/systems';

const world = createWorld();
const entityId = addEntity(world);

// On drag start
captureMouseTo(entityId);
```

### releaseMouse

Stop capturing mouse events.

```typescript
import { releaseMouse } from 'blecsd/systems';

// On drag end
releaseMouse();
```

### isMouseCaptured / getMouseCaptureEntity

Check capture state.

```typescript
import { isMouseCaptured, getMouseCaptureEntity } from 'blecsd/systems';

if (isMouseCaptured()) {
  const entity = getMouseCaptureEntity();
}
```

## Event Bus

The input system dispatches events to a global event bus.

### getInputEventBus

Get the event bus to subscribe to UI events.

```typescript
import { getInputEventBus } from 'blecsd/systems';

const bus = getInputEventBus();

bus.on('click', ({ x, y, button }) => {
  console.log(`Click at ${x}, ${y}`);
});

bus.on('keypress', ({ key, ctrl, meta, shift }) => {
  console.log(`Key: ${key}`);
});

bus.on('mousemove', ({ x, y }) => {
  // Track mouse position
});

bus.on('mouseenter', ({ x, y }) => {
  // Mouse entered an entity
});

bus.on('mouseleave', ({ x, y }) => {
  // Mouse left an entity
});

bus.on('scroll', ({ direction, amount }) => {
  console.log(`Scroll ${direction}`);
});
```

## System Registration

### registerInputSystem

Register the input system with a scheduler.

```typescript
import { registerInputSystem } from 'blecsd/systems';
import { createScheduler } from 'blecsd/core';

const scheduler = createScheduler();
registerInputSystem(scheduler);
// Optional priority: registerInputSystem(scheduler, 10);
```

The input system is automatically registered in the protected INPUT phase, ensuring it always runs first.

### inputSystem

The raw system function (for advanced use).

```typescript
import { inputSystem } from 'blecsd/systems';

// Manual execution (rarely needed)
inputSystem(world);
```

## Utility Functions

### clearEntityInput

Clear input state for an entity.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { clearEntityInput } from 'blecsd/systems';

const world = createWorld();
const entity = addEntity(world);

// Clear keyboard and mouse state
clearEntityInput(world, entity);
```

### queryInputReceivers

Get all entities that can receive input.

```typescript
import { createWorld } from 'blecsd/core';
import { queryInputReceivers } from 'blecsd/systems';

const world = createWorld();
const receivers = queryInputReceivers(world);
// Returns entities with Interactive or Focusable components
console.log('input receivers:', receivers.length);
```

### resetInputState

Reset all input system state (for testing).

```typescript
import { resetInputState } from 'blecsd/systems';

resetInputState();
```

## Types

### QueuedKeyEvent

```typescript
interface QueuedKeyEvent {
  type: 'key';
  event: KeyEvent;
  timestamp: number;
}
```

### QueuedMouseEvent

```typescript
interface QueuedMouseEvent {
  type: 'mouse';
  event: MouseEvent;
  timestamp: number;
}
```

### HitTestResult

```typescript
interface HitTestResult {
  entity: Entity;
  localX: number;
  localY: number;
  zIndex: number;
}
```

### InputSystemState

```typescript
interface InputSystemState {
  eventQueue: QueuedInputEvent[];
  capturedEntity: Entity | null;
  lastMouseX: number;
  lastMouseY: number;
  lastHoveredEntity: Entity | null;
  eventBus: EventBus<UIEventMap>;
}
```

## Integration Example

Complete example integrating input stream with input system:

```typescript
import { createWorld, addEntity, createScheduler } from 'blecsd/core';
import { createInputHandler } from 'blecsd/terminal';
import {
  registerInputSystem,
  queueKeyEvent,
  queueMouseEvent,
  getInputEventBus,
} from 'blecsd/systems';
import {
  setPosition,
  setDimensions,
  setInteractive,
  makeFocusable,
} from 'blecsd/components';

// Create world and scheduler
const world = createWorld();
const scheduler = createScheduler();
registerInputSystem(scheduler);

// Create an interactive button
const button = addEntity(world);
setPosition(world, button, 10, 5);
setDimensions(world, button, 20, 3);
setInteractive(world, button, { clickable: true, hoverable: true });
makeFocusable(world, button, true);

// Set up input handling
const inputHandler = createInputHandler(process.stdin);
inputHandler.onKey(queueKeyEvent);
inputHandler.onMouse(queueMouseEvent);

// Subscribe to events
getInputEventBus().on('click', ({ x, y }) => {
  console.log(`Button clicked!`);
});

// Start input and game loop
// inputHandler.start();  // Would start listening for real input
let lastTime = Date.now();

setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  scheduler.run(world, dt);
}, 16);
```
