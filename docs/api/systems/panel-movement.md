# Panel Movement System API

Fast panel movement and resizing system with constraint enforcement, dirty rect tracking, and keyboard support.

## Overview

The panel movement system handles:
- Mouse-driven panel dragging and resizing
- Keyboard-based panel movement and resizing
- Resize handle detection (8 directions: corners and edges)
- Constraint enforcement (min/max size, screen bounds, grid snap)
- Dirty rectangle tracking for efficient redraws
- Deferred content layout during drag for 60fps performance

## Quick Start

```typescript
import {
  createPanelMoveState,
  createPanelConstraints,
  beginMove,
  updateMove,
  endMoveOrResize,
} from 'blecsd';

let state = createPanelMoveState();
const constraints = createPanelConstraints({ screenWidth: 80, screenHeight: 24 });

// On drag start
state = beginMove(state, entity, mouseX, mouseY, panelX, panelY, 30, 10);

// On drag update
const result = updateMove(state, mouseX, mouseY, constraints);
// Apply result.x, result.y to entity position

// On drag end
state = endMoveOrResize(state);
```

## Types

### ResizeHandle

```typescript
type ResizeHandle =
  | 'top' | 'bottom' | 'left' | 'right'
  | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
```

### PanelConstraints

```typescript
interface PanelConstraints {
  readonly minWidth: number;       // default: 4
  readonly minHeight: number;      // default: 2
  readonly maxWidth: number;       // 0 = no limit
  readonly maxHeight: number;      // 0 = no limit
  readonly constrainToScreen: boolean; // default: true
  readonly screenWidth: number;    // default: 80
  readonly screenHeight: number;   // default: 24
  readonly snapGrid: number;       // 0 = no snap
}
```

### PanelMoveState

Tracks the current move or resize operation state.

```typescript
interface PanelMoveState {
  readonly entity: Entity | undefined;
  readonly isMoving: boolean;
  readonly isResizing: boolean;
  readonly resizeHandle: ResizeHandle | undefined;
  readonly startX: number;
  readonly startY: number;
  readonly panelStartX: number;
  readonly panelStartY: number;
  readonly panelStartWidth: number;
  readonly panelStartHeight: number;
  readonly layoutDeferred: boolean;
}
```

### PanelMoveConfig

```typescript
interface PanelMoveConfig {
  readonly deferLayout: boolean;         // default: true
  readonly outlineResize: boolean;       // default: false
  readonly keyboardStep: number;         // default: 1
  readonly keyboardResizeStep: number;   // default: 1
}
```

### DirtyRect

```typescript
interface DirtyRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
```

### MoveResult

```typescript
interface MoveResult {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly dirtyRects: readonly DirtyRect[];
  readonly clamped: boolean;
}
```

## Functions

### createPanelMoveState

Creates initial panel move state.

```typescript
function createPanelMoveState(): PanelMoveState
```

### createPanelMoveConfig

Creates panel move configuration with defaults.

```typescript
function createPanelMoveConfig(config?: Partial<PanelMoveConfig>): PanelMoveConfig
```

### createPanelConstraints

Creates panel constraints with defaults.

```typescript
function createPanelConstraints(constraints?: Partial<PanelConstraints>): PanelConstraints
```

### beginMove

Begins a panel move operation.

```typescript
function beginMove(
  state: PanelMoveState,
  entity: Entity,
  mouseX: number,
  mouseY: number,
  panelX: number,
  panelY: number,
  panelWidth: number,
  panelHeight: number,
  config?: Partial<PanelMoveConfig>,
): PanelMoveState
```

### beginResize

Begins a panel resize operation on a specific handle.

```typescript
function beginResize(
  state: PanelMoveState,
  entity: Entity,
  handle: ResizeHandle,
  mouseX: number,
  mouseY: number,
  panelX: number,
  panelY: number,
  panelWidth: number,
  panelHeight: number,
  config?: Partial<PanelMoveConfig>,
): PanelMoveState
```

### updateMove

Updates a panel move with a new cursor position. Returns the new position with constraints applied.

```typescript
function updateMove(
  state: PanelMoveState,
  mouseX: number,
  mouseY: number,
  constraints?: Partial<PanelConstraints>,
): MoveResult
```

### updateResize

Updates a panel resize with a new cursor position.

```typescript
function updateResize(
  state: PanelMoveState,
  mouseX: number,
  mouseY: number,
  constraints?: Partial<PanelConstraints>,
): MoveResult
```

### endMoveOrResize

Ends the current move or resize operation.

```typescript
function endMoveOrResize(state: PanelMoveState): PanelMoveState
```

### cancelMoveOrResize

Cancels the current operation and returns original position data for restoration.

```typescript
function cancelMoveOrResize(state: PanelMoveState): {
  state: PanelMoveState;
  restoreX: number;
  restoreY: number;
  restoreWidth: number;
  restoreHeight: number;
}
```

### keyboardMove

Moves a panel by a keyboard step amount in a given direction.

```typescript
function keyboardMove(
  x: number,
  y: number,
  width: number,
  height: number,
  direction: 'up' | 'down' | 'left' | 'right',
  step: number,
  constraints?: Partial<PanelConstraints>,
): { x: number; y: number }
```

### keyboardResize

Resizes a panel by a keyboard step amount.

```typescript
function keyboardResize(
  width: number,
  height: number,
  direction: 'grow-horizontal' | 'shrink-horizontal' | 'grow-vertical' | 'shrink-vertical',
  step: number,
  constraints?: Partial<PanelConstraints>,
): { width: number; height: number }
```

### detectResizeHandle

Detects which resize handle a click position corresponds to.

```typescript
function detectResizeHandle(
  clickX: number,
  clickY: number,
  panelWidth: number,
  panelHeight: number,
  borderSize?: number,
): ResizeHandle | undefined
```

```typescript
import { detectResizeHandle, beginResize } from 'blecsd';

const handle = detectResizeHandle(localX, localY, panelWidth, panelHeight);
if (handle) {
  state = beginResize(state, entity, handle, mouseX, mouseY, px, py, pw, ph);
}
```

### mergeDirtyRects

Merges overlapping dirty rectangles into a single bounding rectangle.

```typescript
function mergeDirtyRects(rects: readonly DirtyRect[]): DirtyRect | undefined
```

## Usage Example

Complete drag-to-move and resize workflow:

```typescript
import {
  createPanelMoveState,
  createPanelConstraints,
  beginMove,
  beginResize,
  updateMove,
  updateResize,
  endMoveOrResize,
  cancelMoveOrResize,
  detectResizeHandle,
  keyboardMove,
  mergeDirtyRects,
  setPosition,
  setDimensions,
} from 'blecsd';

let moveState = createPanelMoveState();
const constraints = createPanelConstraints({
  screenWidth: 120,
  screenHeight: 40,
  minWidth: 10,
  minHeight: 5,
  snapGrid: 0,
});

// On mouse down
function onMouseDown(eid: Entity, mouseX: number, mouseY: number, localX: number, localY: number) {
  const handle = detectResizeHandle(localX, localY, 30, 10);
  if (handle) {
    moveState = beginResize(moveState, eid, handle, mouseX, mouseY, px, py, 30, 10);
  } else {
    moveState = beginMove(moveState, eid, mouseX, mouseY, px, py, 30, 10);
  }
}

// On mouse move
function onMouseMove(mouseX: number, mouseY: number) {
  if (moveState.isMoving) {
    const result = updateMove(moveState, mouseX, mouseY, constraints);
    setPosition(world, moveState.entity!, result.x, result.y);
    const merged = mergeDirtyRects(result.dirtyRects);
    // Redraw merged area
  } else if (moveState.isResizing) {
    const result = updateResize(moveState, mouseX, mouseY, constraints);
    setPosition(world, moveState.entity!, result.x, result.y);
    setDimensions(world, moveState.entity!, result.width, result.height);
  }
}

// On mouse up
function onMouseUp() {
  moveState = endMoveOrResize(moveState);
}

// On Escape (cancel)
function onEscape() {
  const restored = cancelMoveOrResize(moveState);
  moveState = restored.state;
  setPosition(world, entity, restored.restoreX, restored.restoreY);
  setDimensions(world, entity, restored.restoreWidth, restored.restoreHeight);
}

// Keyboard movement
function onArrowKey(direction: 'up' | 'down' | 'left' | 'right') {
  const pos = keyboardMove(px, py, 30, 10, direction, 1, constraints);
  setPosition(world, entity, pos.x, pos.y);
}
```
