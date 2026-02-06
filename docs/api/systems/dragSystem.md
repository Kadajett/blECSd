# Drag System

The drag system handles drag and drop interactions for UI elements. It supports constraints like parent bounds, axis locking, grid snapping, and emits events for drag lifecycle.

## Import

```typescript
import {
  createDragSystem,
  setDragConstraints,
  getDragConstraints,
  clearDragConstraints,
  setDragVerifyCallback,
  getDragVerifyCallback,
  resetDragStores,
  type DragConstraints,
  type DragVerifyCallback,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  type DropEvent,
  type DragEventMap,
  type DragState,
} from 'blecsd';
```

## Basic Usage

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  createDragSystem,
  createEventBus,
  setPosition,
  setDraggable,
} from 'blecsd';

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
const dragSystem = createDragSystem(eventBus);

// State queries
dragSystem.getState(): Readonly<DragState>;
dragSystem.isDragging(): boolean;
dragSystem.getDraggingEntity(): Entity | null;

// Drag lifecycle
dragSystem.canDrag(world, entity): boolean;
dragSystem.startDrag(world, entity, mouseX, mouseY): boolean;
dragSystem.updateDrag(world, mouseX, mouseY): boolean;
dragSystem.endDrag(world, dropTarget?, cancelled?): void;
dragSystem.cancelDrag(world): void;
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
// Constrain to parent bounds
setDragConstraints(widget, { constrainToParent: true });

// Lock to horizontal axis
setDragConstraints(slider, { constrainAxis: 'x' });

// Grid snapping
setDragConstraints(icon, {
  snapToGrid: { x: 10, y: 10 },
});

// Bounded region
setDragConstraints(handle, {
  minX: 0,
  maxX: 100,
  minY: 0,
  maxY: 50,
});

// Bring to front when dragging
setDragConstraints(window, {
  bringToFront: true,
  frontZIndex: 9999,
});

// Clear constraints
clearDragConstraints(widget);
```

## Drag Verification

Use a verification callback to conditionally block drag movements:

```typescript
// Prevent dragging into forbidden zones
setDragVerifyCallback(entity, (entity, dx, dy) => {
  const newX = Position.x[entity] + dx;
  const newY = Position.y[entity] + dy;

  // Don't allow dragging into forbidden area
  if (newX > 50 && newX < 60 && newY > 10 && newY < 20) {
    return false;
  }

  return true;
});

// Remove callback
setDragVerifyCallback(entity, null);
```

## Example: Draggable Window

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createDragSystem,
  createEventBus,
  setDragConstraints,
} from 'blecsd';

const dragEvents = createEventBus<DragEventMap>();
const dragSystem = createDragSystem(dragEvents);

// Create a window entity
const window = addEntity(world);
setPosition(world, window, 10, 5);
setDimensions(world, window, 40, 15);
setDraggable(world, window, true);

// Constrain to screen and bring to front
setDragConstraints(window, {
  minX: 0,
  maxX: 80 - 40, // Screen width - window width
  minY: 0,
  maxY: 24 - 15, // Screen height - window height
  bringToFront: true,
});

// Show drag handle cursor
dragEvents.on('dragstart', () => {
  setCursor('move');
});

dragEvents.on('dragend', () => {
  setCursor('default');
});
```

## Example: Slider Control

```typescript
// Create horizontal slider
const sliderTrack = addEntity(world);
setPosition(world, sliderTrack, 10, 10);
setDimensions(world, sliderTrack, 30, 1);

const sliderThumb = addEntity(world);
setPosition(world, sliderThumb, 10, 10);
setDimensions(world, sliderThumb, 1, 1);
setDraggable(world, sliderThumb, true);

// Lock to horizontal axis within track bounds
setDragConstraints(sliderThumb, {
  constrainAxis: 'x',
  minX: 10,
  maxX: 10 + 30 - 1,
});

// Update value on drag
dragEvents.on('drag', (e) => {
  if (e.entity === sliderThumb) {
    const value = (e.x - 10) / 29; // 0-1
    updateSliderValue(value);
  }
});
```

## Example: Grid-Based Layout

```typescript
// Create icons that snap to grid
const GRID_SIZE = 8;

for (let i = 0; i < 5; i++) {
  const icon = addEntity(world);
  setPosition(world, icon, i * GRID_SIZE, 0);
  setDimensions(world, icon, GRID_SIZE - 1, GRID_SIZE - 1);
  setDraggable(world, icon, true);

  setDragConstraints(icon, {
    snapToGrid: { x: GRID_SIZE, y: GRID_SIZE },
    constrainToParent: true,
  });
}
```

## Example: Drag and Drop File Manager

```typescript
const dragEvents = createEventBus<DragEventMap>();
const dragSystem = createDragSystem(dragEvents);

// Track drag source for drop handling
let dragSource: Entity | null = null;

dragEvents.on('dragstart', (e) => {
  dragSource = e.entity;
  showDragPreview(e.entity, e.mouseX, e.mouseY);
});

dragEvents.on('drag', (e) => {
  updateDragPreview(e.mouseX, e.mouseY);
  highlightDropTarget(findDropTarget(e.mouseX, e.mouseY));
});

dragEvents.on('drop', (e) => {
  if (e.dropTarget && isFolder(e.dropTarget)) {
    moveFileToFolder(dragSource!, e.dropTarget);
  }
  hideDragPreview();
  clearDropHighlight();
  dragSource = null;
});

dragEvents.on('dragend', (e) => {
  if (e.cancelled) {
    hideDragPreview();
    clearDropHighlight();
    dragSource = null;
  }
});
```

## Cleanup

```typescript
// Reset all drag stores (useful for testing)
resetDragStores();
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
