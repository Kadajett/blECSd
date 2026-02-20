# Drag System

The drag system handles drag and drop interactions for UI elements. It supports constraints like parent bounds, axis locking, grid snapping, and emits events for drag lifecycle.

## Import

```typescript
import {
  type DragConstraints,
  type DragVerifyCallback,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  type DropEvent,
  type DragEventMap,
  type DragState,
} from 'blecsd/core';
import {
  createDragSystem,
  setDragConstraints,
  getDragConstraints,
  clearDragConstraints,
  setDragVerifyCallback,
  getDragVerifyCallback,
  resetDragStores,
} from 'blecsd/systems';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createDragSystem } from 'blecsd/systems';
import { createEventBus } from 'blecsd/core';
import { setPosition, setDraggable } from 'blecsd/components';

const world = createWorld();

// Create event bus for drag events
const dragEvents = createEventBus<DragEventMap>();
const dragSystem = createDragSystem(dragEvents);

// Create a draggable entity
const widget = addEntity(world);
setPosition(world, widget, 10, 5);
setDraggable(world, widget, true);

// Listen for drag events
dragEvents.on('dragstart', (e) => {
  console.log(`Started dragging entity ${e.entity}`);
});

dragEvents.on('drag', (e) => {
  console.log(`Dragged to ${e.x}, ${e.y}`);
});

dragEvents.on('dragend', (e) => {
  console.log(`Drag ended, total movement: ${e.totalDx}, ${e.totalDy}`);
});

dragEvents.on('drop', (e) => {
  console.log(`Dropped on ${e.dropTarget}`);
});
```

## Integration with Input

The drag system is designed to integrate with your input handling:

```typescript
import { createWorld } from 'blecsd/core';
import { createEventBus } from 'blecsd/core';
import { createDragSystem } from 'blecsd/systems';
import type { Entity } from 'blecsd/core';

const world = createWorld();
const dragSystem = createDragSystem(createEventBus());

// In your mouse event handlers
function onMouseDown(x: number, y: number, entity: Entity) {
  if (dragSystem.canDrag(world, entity)) {
    dragSystem.startDrag(world, entity, x, y);
  }
}

function onMouseMove(x: number, y: number) {
  dragSystem.updateDrag(world, x, y);
}

function onMouseUp(x: number, y: number, dropTarget: Entity | null) {
  dragSystem.endDrag(world, dropTarget);
}

// Cancel on Escape
function onKeyPress(key: string) {
  if (key === 'escape' && dragSystem.isDragging()) {
    dragSystem.cancelDrag(world);
  }
}
```

## Drag Events

```typescript
interface DragEventMap {
  /** Emitted when drag starts */
  dragstart: {
    entity: Entity;
    startX: number;
    startY: number;
    mouseX: number;
    mouseY: number;
  };

  /** Emitted on each drag movement */
  drag: {
    entity: Entity;
    x: number;
    y: number;
    dx: number;
    dy: number;
    mouseX: number;
    mouseY: number;
  };

  /** Emitted when drag ends (or is cancelled) */
  dragend: {
    entity: Entity;
    x: number;
    y: number;
    totalDx: number;
    totalDy: number;
    cancelled: boolean;
  };

  /** Emitted on successful drop */
  drop: {
    entity: Entity;
    x: number;
    y: number;
    dropTarget: Entity | null;
  };
}
```

## Drag System API

```typescript
import { createWorld, addEntity, createEventBus } from 'blecsd/core';
import { createDragSystem } from 'blecsd/systems';

const world = createWorld();
const entity = addEntity(world);
const eventBus = createEventBus();
const dragSystem = createDragSystem(eventBus);

// State queries
dragSystem.getState();
dragSystem.isDragging();
dragSystem.getDraggingEntity();

// Drag lifecycle
dragSystem.canDrag(world, entity);
dragSystem.startDrag(world, entity, 0, 0);
dragSystem.updateDrag(world, 0, 0);
dragSystem.endDrag(world);
dragSystem.cancelDrag(world);
```

## Drag Constraints

Constraints control how an entity can be dragged:

```typescript
interface DragConstraints {
  /** Constrain to parent bounds */
  constrainToParent?: boolean;
  /** Lock to a single axis */
  constrainAxis?: 'x' | 'y' | null;
  /** Snap to grid */
  snapToGrid?: { x: number; y: number } | null;
  /** Minimum X position */
  minX?: number;
  /** Maximum X position */
  maxX?: number;
  /** Minimum Y position */
  minY?: number;
  /** Maximum Y position */
  maxY?: number;
  /** Bring entity to front when dragging starts */
  bringToFront?: boolean;
  /** Z-index to use when bringing to front */
  frontZIndex?: number;
}
```

### Setting Constraints

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setDragConstraints, clearDragConstraints } from 'blecsd/systems';

const world = createWorld();
const widget = addEntity(world);
const slider = addEntity(world);
const icon = addEntity(world);
const handle = addEntity(world);
const window2 = addEntity(world);

// Constrain to parent bounds
setDragConstraints(world, widget, { constrainToParent: true });

// Lock to horizontal axis
setDragConstraints(world, slider, { constrainAxis: 'x' });

// Grid snapping
setDragConstraints(world, icon, {
  snapToGrid: { x: 10, y: 10 },
});

// Bounded region
setDragConstraints(world, handle, {
  minX: 0,
  maxX: 100,
  minY: 0,
  maxY: 50,
});

// Bring to front when dragging
setDragConstraints(world, window2, {
  bringToFront: true,
  frontZIndex: 9999,
});

// Clear constraints
clearDragConstraints(world, widget);
```

## Drag Verification

Use a verification callback to conditionally block drag movements:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setDragVerifyCallback, getDragVerifyCallback } from 'blecsd/systems';
import { getPosition } from 'blecsd/components';

const world = createWorld();
const entity = addEntity(world);

// Prevent dragging into forbidden zones
setDragVerifyCallback(world, entity, (eid, dx, dy) => {
  const pos = getPosition(world, eid);
  if (!pos) return true;
  const newX = pos.x + dx;
  const newY = pos.y + dy;

  // Don't allow dragging into forbidden area
  if (newX > 50 && newX < 60 && newY > 10 && newY < 20) {
    return false;
  }

  return true;
});

// Remove callback
setDragVerifyCallback(world, entity, null);
const verifyCallback = getDragVerifyCallback(world, entity);
console.log('verify callback cleared:', verifyCallback === null);
```

## Example: Draggable Window

```typescript
import { createWorld, addEntity, createEventBus } from 'blecsd/core';
import { createDragSystem, setDragConstraints } from 'blecsd/systems';
import { setPosition, setDimensions, setDraggable } from 'blecsd/components';

const world = createWorld();
const dragEvents = createEventBus();
const dragSystem = createDragSystem(dragEvents);

// Create a window entity
const windowEntity = addEntity(world);
setPosition(world, windowEntity, 10, 5);
setDimensions(world, windowEntity, 40, 15);
setDraggable(world, windowEntity, true);

// Constrain to screen and bring to front
setDragConstraints(world, windowEntity, {
  minX: 0,
  maxX: 80 - 40, // Screen width - window width
  minY: 0,
  maxY: 24 - 15, // Screen height - window height
  bringToFront: true,
});

// Listen for drag events
dragEvents.on('dragstart', () => {
  // Handle drag start
});

dragEvents.on('dragend', () => {
  // Handle drag end
});

console.log('dragSystem ready:', typeof dragSystem === 'object');
```

## Example: Slider Control

```typescript
import { createWorld, addEntity, createEventBus } from 'blecsd/core';
import { createDragSystem, setDragConstraints } from 'blecsd/systems';
import { setPosition, setDimensions, setDraggable } from 'blecsd/components';

const world = createWorld();
const dragEvents2 = createEventBus();
const dragSystem2 = createDragSystem(dragEvents2);

// Create horizontal slider
const sliderTrack = addEntity(world);
setPosition(world, sliderTrack, 10, 10);
setDimensions(world, sliderTrack, 30, 1);

const sliderThumb = addEntity(world);
setPosition(world, sliderThumb, 10, 10);
setDimensions(world, sliderThumb, 1, 1);
setDraggable(world, sliderThumb, true);

// Lock to horizontal axis within track bounds
setDragConstraints(world, sliderThumb, {
  constrainAxis: 'x',
  minX: 10,
  maxX: 10 + 30 - 1,
});

// Update value on drag
dragEvents2.on('drag', (e: { entity: number; x: number }) => {
  if (e.entity === sliderThumb) {
    const value = (e.x - 10) / 29; // 0-1
    console.log('slider value (0-1):', value);
  }
});

console.log('dragSystem2 ready:', typeof dragSystem2 === 'object');
```

## Example: Grid-Based Layout

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setDragConstraints } from 'blecsd/systems';
import { setPosition, setDimensions, setDraggable } from 'blecsd/components';

const world = createWorld();
const GRID_SIZE = 8;

for (let i = 0; i < 5; i++) {
  const gridIcon = addEntity(world);
  setPosition(world, gridIcon, i * GRID_SIZE, 0);
  setDimensions(world, gridIcon, GRID_SIZE - 1, GRID_SIZE - 1);
  setDraggable(world, gridIcon, true);

  setDragConstraints(world, gridIcon, {
    snapToGrid: { x: GRID_SIZE, y: GRID_SIZE },
    constrainToParent: true,
  });
}
```

## Example: Drag and Drop File Manager

```typescript
import { createEventBus } from 'blecsd/core';
import { createDragSystem } from 'blecsd/systems';

const dragEvents3 = createEventBus();
const dragSystem3 = createDragSystem(dragEvents3);

// Track drag source for drop handling
let dragSource: number | null = null;

dragEvents3.on('dragstart', (e: { entity: number; mouseX: number; mouseY: number }) => {
  dragSource = e.entity;
});

dragEvents3.on('drag', (e: { mouseX: number; mouseY: number }) => {
  console.log('drag position:', e.mouseX, e.mouseY);
});

dragEvents3.on('drop', (e: { dropTarget: number | null }) => {
  if (e.dropTarget) {
    // Handle drop
  }
  dragSource = null;
});

dragEvents3.on('dragend', (e: { cancelled: boolean }) => {
  if (e.cancelled) {
    dragSource = null;
  }
});

console.log('dragSystem3 ready:', typeof dragSystem3 === 'object');
console.log('dragSource after drop:', dragSource);
```

## Cleanup

```typescript
import { createWorld } from 'blecsd/core';
import { resetDragStores } from 'blecsd/systems';

const world = createWorld();

// Reset all drag stores (useful for testing)
resetDragStores(world);
```

## Performance Considerations

- Constraint checking is lightweight
- Grid snapping uses simple rounding
- Parent bounds constraint requires parent dimensions lookup
- Events are only emitted when position actually changes

## Related

- [Input System](./input-system.md) - Mouse event handling
- [Focus System](./focus.md) - Keyboard focus
- [Collision System](./collisionSystem.md) - Drop target detection
