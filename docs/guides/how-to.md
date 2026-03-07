# How-To Guides

Practical, task-oriented guides for common blECSd operations.

**Recommended Setup:** For new projects, use `createApp()` to streamline initialization:

```typescript
import { createApp } from 'blecsd';

const { world, run, stop } = createApp();
// ... build your UI ...
await run();
```

`createApp()` handles world creation, system registration, and terminal program lifecycle automatically. Examples below show manual setup for educational purposes — feel free to use `createApp()` instead.

## Table of Contents

### Basic Tasks
- [Handle Keyboard Input](#handle-keyboard-input)
- [Handle Mouse Clicks](#handle-mouse-clicks)
- [Create a Custom Widget](#create-a-custom-widget)
- [Debug Rendering Issues](#debug-rendering-issues)
- [Implement Drag-and-Drop](#implement-drag-and-drop)
- [Create Modal Dialogs](#create-modal-dialogs)
- [Implement Keyboard Shortcuts](#implement-keyboard-shortcuts)

### Intermediate Tasks
- [Virtualize Large Lists](#virtualize-large-lists)
- [Implement Undo/Redo](#implement-undoredo)
- [Persist UI State](#persist-ui-state)
- [Create a Plugin System](#create-a-plugin-system)
- [Integrate with External Renderers](#integrate-with-external-renderers)
- [Optimize Performance](#optimize-performance)

### Advanced Tasks
- [Write Custom ECS Systems](#write-custom-ecs-systems)
- [Integrate with Other ECS Libraries](#integrate-with-other-ecs-libraries)
- [Build a Theme System](#build-a-theme-system)
- [Implement Accessibility Features](#implement-accessibility-features)

---

## Handle Keyboard Input

### Goal
Capture keyboard events and respond to key presses in your application.

### Prerequisites
- Basic understanding of ECS concepts
- Completed quick start example

### Steps

**1. Queue keyboard events**

```typescript
import { parseKeyBuffer } from 'blecsd/terminal';

// Enable raw mode for key capture
process.stdin.setRawMode(true);
process.stdin.resume();

// Parse and queue events
process.stdin.on('data', (buffer) => {
  const keyEvent = parseKeyBuffer(buffer);
  if (keyEvent) {
    queueKeyEvent(keyEvent);
  }
});
```

**2. Process events in the input system**

The `inputSystem` automatically processes queued events. Just register it with a game loop:

```typescript
import { inputSystem } from 'blecsd/systems';
import { createGameLoop, LoopPhase } from 'blecsd/core';

const loop = createGameLoop(world, { targetFPS: 60 });
loop.registerInputSystem(inputSystem);
```

**3. Listen for key events**

```typescript
import { getInputEventBus } from 'blecsd/systems';

const eventBus = getInputEventBus();

eventBus.on('keypress', (event) => {
  console.log(`Key pressed: ${event.name}`);

  if (event.name === 'q' && event.ctrl) {
    console.log('Ctrl+Q pressed, exiting...');
    process.exit(0);
  }
});
```

### Complete Example

```typescript
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';
import { inputSystem, queueKeyEvent, getInputEventBus } from 'blecsd/systems';
import { parseKeyBuffer } from 'blecsd/terminal';

const world = createWorld();
const loop = createGameLoop(world, { targetFPS: 60 });

// Register input system
loop.registerInputSystem(inputSystem);

// Setup keyboard capture
process.stdin.setRawMode(true);
process.stdin.resume();

process.stdin.on('data', (buffer) => {
  const keyEvent = parseKeyBuffer(buffer);
  if (keyEvent) {
    queueKeyEvent(keyEvent);
  }
});

// Listen for key events
const eventBus = getInputEventBus();

eventBus.on('keypress', (event) => {
  if (event.name === 'up') {
    console.log('Up arrow pressed');
  } else if (event.name === 'down') {
    console.log('Down arrow pressed');
  } else if (event.name === 'q' && event.ctrl) {
    process.exit(0);
  }
});

// Start the loop
loop.start();
```

### Common Pitfalls

- **Not enabling raw mode**: Terminal won't send individual key events
- **Forgetting Ctrl+C handler**: Users can't exit your app gracefully
- **Not draining event queue**: Events build up and cause lag

### See Also

- [API Reference: Input System](../api/systems.md#inputsystem)
- [Keyboard Shortcuts Guide](./keyboard-shortcuts.md)

---

## Handle Mouse Clicks

### Goal
Detect and respond to mouse clicks on UI elements.

### Prerequisites
- Understanding of entity hierarchy
- Familiarity with the input system

### Steps

**1. Enable mouse tracking**

```typescript
import { parseMouseSequence } from 'blecsd/terminal';
import { queueMouseEvent } from 'blecsd/systems';

process.stdin.setRawMode(true);
process.stdin.resume();

// Enable mouse tracking in terminal
process.stdout.write('\x1b[?1000h');  // Normal tracking
process.stdout.write('\x1b[?1003h');  // Any event tracking

process.stdin.on('data', (buffer) => {
  const mouseEvent = parseMouseSequence(buffer);
  if (mouseEvent) {
    queueMouseEvent(mouseEvent);
  }
});

// Cleanup on exit
process.on('exit', () => {
  process.stdout.write('\x1b[?1000l');
  process.stdout.write('\x1b[?1003l');
});
```

**2. Add Interactive component to clickable entities**

```typescript
import { addEntity } from 'blecsd/core';
import { setPosition, setDimensions, Interactive } from 'blecsd/components';

const button = addEntity(world);
setPosition(world, button, 10, 5);
setDimensions(world, button, 15, 3);
Interactive.enabled[button] = 1;  // Make it clickable
```

**3. Listen for click events**

```typescript
import { getInputEventBus } from 'blecsd/systems';

const eventBus = getInputEventBus();

eventBus.on('click', (event) => {
  console.log(`Clicked entity ${event.entity} at (${event.x}, ${event.y})`);
});
```

### Complete Example

```typescript
import {
  createWorld,
  addEntity,
  createGameLoop,
  LoopPhase,
  addComponent,
} from 'blecsd/core';
import {
  setPosition,
  setDimensions,
  Renderable,
  Interactive,
} from 'blecsd/components';
import {
  inputSystem,
  renderSystem,
  outputSystem,
  queueMouseEvent,
  getInputEventBus,
} from 'blecsd/systems';
import { parseMouseSequence } from 'blecsd/terminal';

const world = createWorld();

// Create clickable button
const button = addEntity(world);
setPosition(world, button, 10, 5);
setDimensions(world, button, 15, 3);
addComponent(world, button, Renderable);
Renderable.fg[button] = 0xFFFFFF;
Renderable.bg[button] = 0x0000FF;
Interactive.enabled[button] = 1;

// Setup mouse tracking
process.stdin.setRawMode(true);
process.stdout.write('\x1b[?1000h');

process.stdin.on('data', (buffer) => {
  const mouseEvent = parseMouseSequence(buffer);
  if (mouseEvent) {
    queueMouseEvent(mouseEvent);
  }
});

// Listen for clicks
const eventBus = getInputEventBus();

eventBus.on('click', (event) => {
  if (event.entity === button) {
    console.log('Button clicked!');
  }
});

// Setup rendering
const loop = createGameLoop(world, { targetFPS: 60 });
loop.registerInputSystem(inputSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);
loop.registerSystem(LoopPhase.POST_RENDER, outputSystem);

loop.start();

// Cleanup
process.on('exit', () => {
  process.stdout.write('\x1b[?1000l');
});
```

### Common Pitfalls

- **Not enabling mouse tracking**: Mouse events won't be sent
- **Forgetting to disable tracking on exit**: Terminal mouse remains broken
- **No Interactive component**: Entity won't receive click events

### See Also

- [API Reference: Interactive Component](../api/components/input.md)
- [API Reference: Input System](../api/systems.md#inputsystem)

---

## Create a Custom Widget

### Goal
Build a reusable custom widget following blECSd patterns.

### Prerequisites
- Understanding of ECS components
- Familiarity with rendering pipeline

### Steps

**1. Define widget state interface**

```typescript
interface ProgressBarOptions {
  readonly value: number;      // 0-100
  readonly width: number;
  readonly height: number;
  readonly barColor: number;
  readonly bgColor: number;
  readonly showLabel: boolean;
}

interface ProgressBarState {
  value: number;
  options: ProgressBarOptions;
}
```

**2. Create factory function**

```typescript
import { type World, type Entity } from 'blecsd/core';
import { addEntity } from 'blecsd/core';
import { setPosition, setDimensions, setStyle } from 'blecsd/components';

const progressBarStateMap = new Map<Entity, ProgressBarState>();

function createProgressBar(
  world: World,
  entity: Entity,
  options: Partial<ProgressBarOptions> = {}
): { update: (value: number) => void } {

  const fullOptions: ProgressBarOptions = {
    value: 0,
    width: 20,
    height: 1,
    barColor: 0x00FF00,
    bgColor: 0x333333,
    showLabel: true,
    ...options,
  };

  // Set up components
  setDimensions(world, entity, fullOptions.width, fullOptions.height);
  setStyle(world, entity, { fg: 0xFFFFFF, bg: fullOptions.bgColor });

  // Store state
  const state: ProgressBarState = {
    value: fullOptions.value,
    options: fullOptions,
  };
  progressBarStateMap.set(entity, state);

  return {
    update: (value: number) => {
      const s = progressBarStateMap.get(entity);
      if (s) {
        s.value = Math.max(0, Math.min(100, value));
      }
    },
  };
}
```

**3. Create render system**

```typescript
import { query } from 'blecsd/core';
import { getDimensions, setStyle } from 'blecsd/components';
import type { World } from 'blecsd/core';

function progressBarRenderSystem(world: World): World {
  // Iterate all tracked progress bars
  for (const [eid, state] of progressBarStateMap) {
    const dims = getDimensions(world, eid);
    if (!dims) continue;

    const { width } = dims;
    const filledWidth = Math.floor((width * state.value) / 100);

    // Render bar: update color based on fill
    const color = filledWidth > 0 ? state.options.barColor : state.options.bgColor;
    setStyle(world, eid, { bg: color });
  }

  return world;
}
```

**4. Register system**

```typescript
import { createGameLoop, LoopPhase, createWorld } from 'blecsd/core';
import type { World } from 'blecsd/core';

// progressBarRenderSystem is defined in the render system block above
function myProgressBarRenderSystem(world: World): World { return world; }

const pbWorld = createWorld();
const pbLoop = createGameLoop(pbWorld, { targetFPS: 60 });
pbLoop.registerSystem(LoopPhase.RENDER, myProgressBarRenderSystem);
```

### Complete Example

```typescript
import { createWorld, addEntity, createGameLoop, LoopPhase } from 'blecsd/core';
import { setPosition, setDimensions, setStyle, getDimensions } from 'blecsd/components';
import type { World, Entity } from 'blecsd/core';

// Self-contained progress bar state
interface PBState2 { value: number; barColor: number; bgColor: number; }
const pbMap2 = new Map<Entity, PBState2>();

function createPB(world: World, eid: Entity, barColor: number): { update: (v: number) => void } {
  setDimensions(world, eid, 30, 1);
  setStyle(world, eid, { fg: 0xFFFFFF, bg: 0x333333 });
  pbMap2.set(eid, { value: 0, barColor, bgColor: 0x333333 });
  return {
    update: (v: number) => {
      const s = pbMap2.get(eid);
      if (s) s.value = Math.max(0, Math.min(100, v));
    },
  };
}

function pbRenderSystem(world: World): World {
  for (const [eid, state] of pbMap2) {
    const dims = getDimensions(world, eid);
    if (!dims) continue;
    const filled = Math.floor((dims.width * state.value) / 100);
    setStyle(world, eid, { bg: filled > 0 ? state.barColor : state.bgColor });
  }
  return world;
}

const pbWorld2 = createWorld();
const pbEid = addEntity(pbWorld2);
setPosition(pbWorld2, pbEid, 5, 5);
const progressBar2 = createPB(pbWorld2, pbEid, 0x00FF00);

const pbLoop2 = createGameLoop(pbWorld2, { targetFPS: 60 });
pbLoop2.registerSystem(LoopPhase.RENDER, pbRenderSystem);

// Update progress in the UPDATE phase
let progress2 = 0;
pbLoop2.registerSystem(LoopPhase.UPDATE, (w: World) => {
  progress2 = (progress2 + 1) % 101;
  progressBar2.update(progress2);
  return w;
});

// Note: call pbLoop2.start() in a real app to run the loop
```

### Common Pitfalls

- **Mutating state directly**: Use factory methods to update state
- **Not cleaning up state**: Remove from Map when entity is destroyed
- **Forgetting to register system**: Widget won't render

### See Also

- [API Reference: Widgets](../api/widgets/)
- [Understanding ECS](./understanding-ecs.md)

---

## Debug Rendering Issues

### Goal
Diagnose and fix visual glitches or missing renders.

### Prerequisites
- Basic rendering pipeline knowledge

### Common Issues and Solutions

### Issue 1: Entity Not Visible

**Symptoms:** Entity exists but doesn't appear on screen.

**Checklist:**
1. ✓ Has Position component?
2. ✓ Has Renderable component?
3. ✓ Is `Renderable.visible[eid]` set to 1?
4. ✓ Is position on screen (not negative or beyond bounds)?
5. ✓ Is entity marked dirty? Call `markDirty(world, eid)`

**Debug code:**
```typescript
import { hasComponent } from 'blecsd/core';
import { Position, Renderable } from 'blecsd/components';

function debugEntity(world: World, eid: Entity): void {
  console.log('Entity', eid);
  console.log('  Has Position?', hasComponent(world, Position, eid));
  console.log('  Has Renderable?', hasComponent(world, Renderable, eid));

  if (hasComponent(world, Position, eid)) {
    console.log('  Position:', Position.x[eid], Position.y[eid]);
  }

  if (hasComponent(world, Renderable, eid)) {
    console.log('  Visible?', Renderable.visible[eid]);
    console.log('  Dirty?', Renderable.dirty[eid]);
  }

  console.log('  Effectively visible?', isEffectivelyVisible(world, eid));
}
```

### Issue 2: Z-Order Wrong

**Symptoms:** Entity renders behind another when it should be in front.

**Solution:** Set z-index:
```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setZIndex } from 'blecsd/components';

const zWorld = createWorld();
const frontEntity = addEntity(zWorld);
const backEntity = addEntity(zWorld);
setZIndex(zWorld, frontEntity, 10);  // Higher = front
setZIndex(zWorld, backEntity, 5);    // Lower = back
```

### Issue 3: Partial Renders

**Symptoms:** Only part of entity visible or cut off.

**Solutions:**
1. **Check clipping:** Entity might be clipped by parent bounds
2. **Check dimensions:** Dimensions might be too small
3. **Check scroll offsets:** Parent might be scrolled

```typescript
import { getComputedBounds } from 'blecsd/systems';
import { getScroll } from 'blecsd/components';
import { Hierarchy } from 'blecsd/components';

const bounds = getComputedBounds(world, eid);
console.log('Computed bounds:', bounds);

const parent = Hierarchy.parent[eid];
if (parent) {
  const scroll = getScroll(world, parent);
  console.log('Parent scroll:', scroll.x, scroll.y);
}
```

### Issue 4: Colors Wrong

**Symptoms:** Colors don't match what you set.

**Solutions:**
1. **Check color format:** Should be hex (0xRRGGBB)
2. **Check terminal support:** Some terminals don't support true color
3. **Check background inheritance:** Might be inheriting parent's bg

```typescript
// Wrong: decimal
Renderable.fg[eid] = 255;  // ❌ Treated as 0x0000FF (blue)

// Right: hex
Renderable.fg[eid] = 0xFF0000;  // ✅ Red
```

### Issue 5: Flickering

**Symptoms:** Entity flickers or disappears randomly.

**Solutions:**
1. **Dirty tracking issue:** Don't mark dirty every frame unless changed
2. **Double buffering:** Ensure output system is configured correctly
3. **Race condition:** Check if multiple systems modify same entity

```typescript
// ❌ Wrong: marks dirty every frame
function badSystem(world: World): World {
  for (const eid of entities) {
    markDirty(world, eid);  // Causes unnecessary re-renders
  }
  return world;
}

// ✅ Right: only mark if changed
function goodSystem(world: World): World {
  for (const eid of entities) {
    const oldValue = Position.x[eid];
    const newValue = computeNewPosition(eid);

    if (oldValue !== newValue) {
      Position.x[eid] = newValue;
      markDirty(world, eid);  // Only when changed
    }
  }
  return world;
}
```

### Debugging Tools

**1. Visual entity inspector:**
```typescript
import { query } from 'blecsd/core';
import { Position, Dimensions } from 'blecsd/components';

function printEntityTree(world: World): void {
  const entities = query(world, [Position]);

  console.log('\n=== Entity Tree ===');
  for (const eid of entities) {
    const x = Position.x[eid] ?? 0;
    const y = Position.y[eid] ?? 0;
    const w = Dimensions.width[eid] ?? 0;
    const h = Dimensions.height[eid] ?? 0;

    console.log(`Entity ${eid}: (${x}, ${y}) ${w}x${h}`);
  }
}
```

**2. Frame budget analysis:**
```typescript
import { getFrameBudgetStats } from 'blecsd/systems';

const { stats } = getFrameBudgetStats();
console.log(`FPS: ${stats.fps.toFixed(1)}`);
console.log(`Frame time: ${stats.frameTimeMs.toFixed(2)}ms`);

for (const timing of stats.systemTimings) {
  console.log(`  ${timing.name}: ${timing.lastMs.toFixed(2)}ms`);
}
```

### See Also

- [Performance Guide](./performance.md)
- [Systems API](../api/systems.md)

---

## Implement Drag-and-Drop

### Goal
Enable dragging entities with the mouse.

### Prerequisites
- Mouse handling basics
- Understanding of Interactive component

### Steps

**1. Track drag state**

```typescript
interface DragState {
  dragging: boolean;
  entity: Entity | null;
  offsetX: number;
  offsetY: number;
}

const dragState: DragState = {
  dragging: false,
  entity: null,
  offsetX: 0,
  offsetY: 0,
};
```

**2. Handle mouse down (start drag)**

```typescript
import { getInputEventBus, captureMouseTo } from 'blecsd/systems';
import { createWorld } from 'blecsd/core';
import { getPosition } from 'blecsd/components';

const mdWorld = createWorld();
const mdEventBus = getInputEventBus();

mdEventBus.on('mousedown', (event) => {
  if (event.entity) {
    dragState.dragging = true;
    dragState.entity = event.entity;

    // Store offset from entity origin
    const pos = getPosition(mdWorld, event.entity);
    dragState.offsetX = event.x - (pos?.x ?? 0);
    dragState.offsetY = event.y - (pos?.y ?? 0);

    // Capture all mouse events to this entity
    captureMouseTo(event.entity);
  }
});
```

**3. Handle mouse move (update position)**

```typescript
import { getInputEventBus } from 'blecsd/systems';
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, markDirty } from 'blecsd/components';

const mmWorld = createWorld();
const mmEventBus = getInputEventBus();

mmEventBus.on('mousemove', (event) => {
  if (dragState.dragging && dragState.entity !== null) {
    // Update entity position
    setPosition(mmWorld, dragState.entity, event.x - dragState.offsetX, event.y - dragState.offsetY);

    // Mark dirty for re-render
    markDirty(mmWorld, dragState.entity);
  }
});
```

**4. Handle mouse up (end drag)**

```typescript
import { getInputEventBus, releaseMouse } from 'blecsd/systems';

const muEventBus = getInputEventBus();
muEventBus.on('mouseup', (_event) => {
  if (dragState.dragging) {
    dragState.dragging = false;
    dragState.entity = null;
    releaseMouse();
  }
});
```

### Complete Example

```typescript
import { type Entity } from 'blecsd/core';
import {
  createWorld,
  addEntity,
  addComponent,
  createGameLoop,
  LoopPhase,
} from 'blecsd/core';
import {
  setPosition,
  setDimensions,
  Renderable,
  Interactive,
  Position,
  markDirty,
} from 'blecsd/components';
import {
  inputSystem,
  renderSystem,
  outputSystem,
  queueMouseEvent,
  getInputEventBus,
  captureMouseTo,
  releaseMouse,
} from 'blecsd/systems';
import { parseMouseSequence } from 'blecsd/terminal';

const world = createWorld();

// Create draggable box
const box = addEntity(world);
setPosition(world, box, 10, 5);
setDimensions(world, box, 10, 5);
addComponent(world, box, Renderable);
Renderable.fg[box] = 0xFFFFFF;
Renderable.bg[box] = 0xFF0000;
Interactive.enabled[box] = 1;

// Drag state
const dragState = {
  dragging: false,
  entity: null as Entity | null,
  offsetX: 0,
  offsetY: 0,
};

// Setup mouse tracking
process.stdin.setRawMode(true);
process.stdout.write('\x1b[?1000h\x1b[?1003h');

process.stdin.on('data', (buffer) => {
  const mouseEvent = parseMouseSequence(buffer);
  if (mouseEvent) {
    queueMouseEvent(mouseEvent);
  }
});

// Handle drag events
const eventBus = getInputEventBus();

eventBus.on('mousedown', (event) => {
  if (event.entity) {
    dragState.dragging = true;
    dragState.entity = event.entity;
    dragState.offsetX = event.x - (Position.x[event.entity] ?? 0);
    dragState.offsetY = event.y - (Position.y[event.entity] ?? 0);
    captureMouseTo(event.entity);
  }
});

eventBus.on('mousemove', (event) => {
  if (dragState.dragging && dragState.entity !== null) {
    Position.x[dragState.entity] = event.x - dragState.offsetX;
    Position.y[dragState.entity] = event.y - dragState.offsetY;
    markDirty(world, dragState.entity);
  }
});

eventBus.on('mouseup', () => {
  if (dragState.dragging) {
    dragState.dragging = false;
    dragState.entity = null;
    releaseMouse();
  }
});

// Setup rendering
const loop = createGameLoop(world, { targetFPS: 60 });
loop.registerInputSystem(inputSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);
loop.registerSystem(LoopPhase.POST_RENDER, outputSystem);

loop.start();
```

### Common Pitfalls

- **Not capturing mouse**: Entity won't receive move events during drag
- **Forgetting offset**: Entity jumps to mouse cursor position
- **Not marking dirty**: Entity position updates but doesn't re-render

### See Also

- [API Reference: Mouse Capture](../api/systems.md#mouse-capture)
- [Panel Movement System](../api/systems/panel-movement.md)

---

## Create Modal Dialogs

### Goal
Display a modal dialog that blocks interaction with background UI.

### Prerequisites
- Understanding of focus system
- Familiarity with z-index layering

### Steps

**1. Create modal overlay**

```typescript
import { addEntity, addComponent } from 'blecsd/core';
import { setPosition, setDimensions, setZIndex } from 'blecsd/components';
import { type World, type Entity } from 'blecsd/core';
import { Renderable } from 'blecsd/components';

function createModal(
  world: World,
  width: number,
  height: number,
  title: string
): Entity {
  // Create semi-transparent overlay
  const overlay = addEntity(world);
  setPosition(world, overlay, 0, 0);
  setDimensions(world, overlay, 80, 24);  // Full screen
  addComponent(world, overlay, Renderable);
  Renderable.fg[overlay] = 0x000000;
  Renderable.bg[overlay] = 0x000000;
  setZIndex(world, overlay, 100);  // Above normal UI

  // Create dialog box
  const dialog = addEntity(world);
  const x = Math.floor((80 - width) / 2);
  const y = Math.floor((24 - height) / 2);
  setPosition(world, dialog, x, y);
  setDimensions(world, dialog, width, height);
  addComponent(world, dialog, Renderable);
  Renderable.fg[dialog] = 0x000000;
  Renderable.bg[dialog] = 0xFFFFFF;
  setZIndex(world, dialog, 101);  // Above overlay

  return dialog;
}
```

**2. Save and restore focus**

```typescript
import { focusPush, focusPop } from 'blecsd/systems';
import { focusEntity } from 'blecsd/components';

function showModal(world: World, modalEntity: Entity): void {
  // Save current focus
  focusPush(world);

  // Focus modal
  focusEntity(world, modalEntity);
}

function closeModal(world: World): void {
  // Restore previous focus
  focusPop(world);

  // Remove modal entities
  // (implementation depends on your entity management)
}
```

**3. Block input to background**

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setInteractive, setFocusable } from 'blecsd/components';

// The focus system automatically blocks input to non-focused entities
// when a modal has focus. Just ensure Interactive.enabled is set:
const modalWorld = createWorld();
const modalEntity = addEntity(modalWorld);
setInteractive(modalWorld, modalEntity, { enabled: true });
setFocusable(modalWorld, modalEntity, true);
```

### Complete Example

```typescript
import { type World, type Entity } from 'blecsd/core';
import {
  createWorld,
  addEntity,
  addComponent,
  createGameLoop,
  LoopPhase,
} from 'blecsd/core';
import {
  setPosition,
  setDimensions,
  Renderable,
  setZIndex,
  Interactive,
  focusEntity,
} from 'blecsd/components';
import {
  inputSystem,
  focusSystem,
  renderSystem,
  outputSystem,
  focusPush,
  focusPop,
  getInputEventBus,
  queueKeyEvent,
} from 'blecsd/systems';
import { parseKeyBuffer } from 'blecsd/terminal';

const world = createWorld();

// Create main UI
const mainPanel = addEntity(world);
setPosition(world, mainPanel, 5, 5);
setDimensions(world, mainPanel, 30, 10);
addComponent(world, mainPanel, Renderable);
Renderable.fg[mainPanel] = 0x000000;
Renderable.bg[mainPanel] = 0x00FF00;

// Function to create modal
function createModal(world: World): Entity {
  // Overlay
  const overlay = addEntity(world);
  setPosition(world, overlay, 0, 0);
  setDimensions(world, overlay, 80, 24);
  addComponent(world, overlay, Renderable);
  Renderable.fg[overlay] = 0x000000;
  Renderable.bg[overlay] = 0x000000;
  setZIndex(world, overlay, 100);

  // Dialog
  const dialog = addEntity(world);
  setPosition(world, dialog, 20, 8);
  setDimensions(world, dialog, 40, 8);
  addComponent(world, dialog, Renderable);
  Renderable.fg[dialog] = 0x000000;
  Renderable.bg[dialog] = 0xFFFFFF;
  Interactive.enabled[dialog] = 1;
  Interactive.focusable[dialog] = 1;
  setZIndex(world, dialog, 101);

  return dialog;
}

// Setup keyboard handling
process.stdin.setRawMode(true);
process.stdin.on('data', (buffer) => {
  const keyEvent = parseKeyBuffer(buffer);
  if (keyEvent) {
    queueKeyEvent(keyEvent);
  }
});

const eventBus = getInputEventBus();

eventBus.on('keypress', (event) => {
  if (event.name === 'm') {
    // Show modal
    const modal = createModal(world);
    focusPush(world, modal);
  } else if (event.name === 'escape') {
    // Close modal
    focusPop(world);
    // TODO: Remove modal entities
  }
});

// Setup rendering
const loop = createGameLoop(world, { targetFPS: 60 });
loop.registerInputSystem(inputSystem);
loop.registerSystem(LoopPhase.UPDATE, focusSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);
loop.registerSystem(LoopPhase.POST_RENDER, outputSystem);

loop.start();
```

### Common Pitfalls

- **Not setting z-index**: Modal renders behind background
- **Not managing focus**: Background still receives input
- **Forgetting to restore focus**: Focus lost after closing modal

### See Also

- [API Reference: Focus System](../api/systems.md#focussystem)
- [API Reference: Z-Index](../api/components/)

---

## Implement Keyboard Shortcuts

### Goal
Add global keyboard shortcuts to your application.

### Prerequisites
- Basic keyboard input handling

### Steps

**1. Define shortcuts**

```typescript
interface Shortcut {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly meta?: boolean;
  readonly shift?: boolean;
  readonly action: () => void;
}

const shortcuts: readonly Shortcut[] = [
  { key: 's', ctrl: true, action: () => saveFile() },
  { key: 'o', ctrl: true, action: () => openFile() },
  { key: 'n', ctrl: true, action: () => newFile() },
  { key: 'q', ctrl: true, action: () => quit() },
  { key: 'z', ctrl: true, action: () => undo() },
  { key: 'z', ctrl: true, shift: true, action: () => redo() },
];
```

**2. Create shortcut matcher**

```typescript
import type { ParsedKeyEvent } from 'blecsd/terminal';

function matchesShortcut(event: ParsedKeyEvent, shortcut: Shortcut): boolean {
  if (event.name !== shortcut.key) return false;
  if ((shortcut.ctrl ?? false) !== event.ctrl) return false;
  if ((shortcut.meta ?? false) !== event.meta) return false;
  if ((shortcut.shift ?? false) !== event.shift) return false;
  return true;
}

function handleShortcut(event: ParsedKeyEvent): boolean {
  for (const shortcut of shortcuts) {
    if (matchesShortcut(event, shortcut)) {
      shortcut.action();
      return true;  // Handled
    }
  }
  return false;  // Not handled
}
```

**3. Register global handler**

```typescript
import { getInputEventBus } from 'blecsd/systems';

const eventBus = getInputEventBus();

eventBus.on('keypress', (event) => {
  const handled = handleShortcut(event);

  if (handled) {
    // Shortcut handled, prevent default
    event.preventDefault?.();
  }
});
```

### Complete Example

```typescript
import type { ParsedKeyEvent } from 'blecsd/terminal';
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';
import { inputSystem, queueKeyEvent, getInputEventBus } from 'blecsd/systems';
import { parseKeyBuffer } from 'blecsd/terminal';

const world = createWorld();

// Define actions
function saveFile(): void {
  console.log('Save file (Ctrl+S)');
}

function openFile(): void {
  console.log('Open file (Ctrl+O)');
}

function undo(): void {
  console.log('Undo (Ctrl+Z)');
}

function redo(): void {
  console.log('Redo (Ctrl+Shift+Z)');
}

function quit(): void {
  console.log('Quit (Ctrl+Q)');
  process.exit(0);
}

// Define shortcuts
const shortcuts = [
  { key: 's', ctrl: true, action: saveFile },
  { key: 'o', ctrl: true, action: openFile },
  { key: 'z', ctrl: true, action: undo },
  { key: 'z', ctrl: true, shift: true, action: redo },
  { key: 'q', ctrl: true, action: quit },
];

// Matcher
function matchesShortcut(event: ParsedKeyEvent, shortcut: any): boolean {
  return (
    event.name === shortcut.key &&
    event.ctrl === (shortcut.ctrl ?? false) &&
    event.meta === (shortcut.meta ?? false) &&
    event.shift === (shortcut.shift ?? false)
  );
}

// Setup keyboard handling
process.stdin.setRawMode(true);
process.stdin.on('data', (buffer) => {
  const keyEvent = parseKeyBuffer(buffer);
  if (keyEvent) {
    queueKeyEvent(keyEvent);
  }
});

const eventBus = getInputEventBus();

eventBus.on('keypress', (event) => {
  for (const shortcut of shortcuts) {
    if (matchesShortcut(event, shortcut)) {
      shortcut.action();
      return;
    }
  }

  // Not a shortcut, handle as normal key
  console.log(`Key: ${event.name}`);
});

// Setup game loop
const loop = createGameLoop(world, { targetFPS: 60 });
loop.registerInputSystem(inputSystem);
loop.start();
```

### Common Pitfalls

- **Platform differences**: Cmd on macOS vs Ctrl on Windows/Linux
- **Conflicting shortcuts**: Check for conflicts with terminal shortcuts
- **Not handling shift**: `Ctrl+Z` vs `Ctrl+Shift+Z` are different

### See Also

- [Keyboard Shortcuts Reference](./keyboard-shortcuts.md)
- [API Reference: Input System](../api/systems.md#inputsystem)

---

## Virtualize Large Lists

### Goal
Display millions of list items with smooth scrolling by only rendering visible items.

### Prerequisites
- Understanding of rendering pipeline
- Familiarity with list widgets

### Steps

**1. Use virtualizedList widget**

The `createVirtualizedList` widget creates a scrollable text buffer that renders only the visible lines, making it efficient for large datasets.

```typescript
import { createWorld } from 'blecsd/core';
import { createVirtualizedList } from 'blecsd/widgets';

const vlWorld = createWorld();

const vlist = createVirtualizedList(vlWorld, {
  x: 5,
  y: 2,
  width: 60,
  height: 20,  // Only 20 rows visible at once
  lines: ['Item 0', 'Item 1', 'Item 2'],
});
```

**2. Populate with large data**

```typescript
import { createWorld } from 'blecsd/core';
import { createVirtualizedList } from 'blecsd/widgets';

// Generate large dataset of lines
const data: string[] = [];
for (let i = 0; i < 1000; i++) {
  data.push(`Item ${i}: ${Math.random().toString(36).substring(7)}`);
}

const vlWorld2 = createWorld();

const vlist2 = createVirtualizedList(vlWorld2, {
  x: 2,
  y: 2,
  width: 60,
  height: 20,
  lines: data,
});
```

**3. Add lines dynamically**

```typescript
import { createWorld } from 'blecsd/core';
import { createVirtualizedList } from 'blecsd/widgets';

const vlWorld3 = createWorld();
const vlist3 = createVirtualizedList(vlWorld3, {
  x: 0,
  y: 0,
  width: 60,
  height: 20,
});

// Add lines dynamically (e.g., log output)
vlist3.appendLine('New log entry 1');
vlist3.appendLine('New log entry 2');
```

### Complete Example

```typescript
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';
import { createVirtualizedList } from 'blecsd/widgets';
import { renderSystem, outputSystem, inputSystem } from 'blecsd/systems';

const vlExWorld = createWorld();

// Generate large dataset
const vlData: string[] = [];
for (let i = 0; i < 1000; i++) {
  vlData.push(`Item ${i}: ${Math.random().toString(36).substring(7)}`);
}

const vlExList = createVirtualizedList(vlExWorld, {
  x: 2,
  y: 2,
  width: 60,
  height: 20,
  lines: vlData,
});

// Setup rendering
const vlLoop = createGameLoop(vlExWorld, { targetFPS: 60 });
vlLoop.registerInputSystem(inputSystem);
vlLoop.registerSystem(LoopPhase.RENDER, renderSystem);
vlLoop.registerSystem(LoopPhase.POST_RENDER, outputSystem);

// Note: call vlLoop.start() in a real app to run the loop
console.log('Virtualized list created with', vlData.length, 'items');
```

### Common Pitfalls

- **Not specifying width/height**: Both are required for the list to render
- **Keeping stale lines**: Call `clear()` before bulk updates
- **Not handling updates**: Use `appendLine()` or `setLines()` to update content

### See Also

- [API Reference: Virtualized List](../api/widgets/virtualizedList.md)
- [Performance Guide](./performance.md#virtualize-large-lists)

---

## Implement Undo/Redo

### Goal
Add undo/redo functionality to your application using the command pattern.

### Prerequisites
- Understanding of state management

### Steps

**1. Define command type**

```typescript
interface Command {
  readonly execute: () => void;
  readonly undo: () => void;
}
```

**2. Implement command history**

```typescript
interface CommandHistory {
    readonly stack: readonly Command[];
    readonly cursor: number;
}

function createCommandHistory(): CommandHistory {
    const h: CommandHistory = { stack: [], cursor: -1 };
    return h;
}

function executeCommand(history: CommandHistory, command: Command): CommandHistory {
    // Remove any commands after current position
    const stack = history.stack.slice(0, history.cursor + 1);
    command.execute();
    const next: CommandHistory = { stack: [...stack, command], cursor: history.cursor + 1 };
    return next;
}

function undoCommand(history: CommandHistory): CommandHistory {
    if (history.cursor < 0) { return history; }
    history.stack[history.cursor]?.undo();
    const prev: CommandHistory = { stack: history.stack, cursor: history.cursor - 1 };
    return prev;
}

function redoCommand(history: CommandHistory): CommandHistory {
    if (history.cursor >= history.stack.length - 1) { return history; }
    const idx = history.cursor + 1;
    history.stack[idx]?.execute();
    const fwd: CommandHistory = { stack: history.stack, cursor: idx };
    return fwd;
}

function canUndo(history: CommandHistory): boolean {
    return history.cursor >= 0;
}

function canRedo(history: CommandHistory): boolean {
    return history.cursor < history.stack.length - 1;
}
```

**3. Create specific commands**

```typescript
import { setPosition } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

function createMoveEntityCommand(
    world: ReturnType<typeof createWorld>,
    eid: number,
    oldX: number,
    oldY: number,
    newX: number,
    newY: number
): Command {
    const cmd: Command = {
        execute: () => setPosition(world, eid, newX, newY),
        undo: () => setPosition(world, eid, oldX, oldY),
    };
    return cmd;
}
```

**4. Use commands in your app**

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition } from 'blecsd/components';

// Command type and history (self-contained for this example)
interface Command4 {
    readonly execute: () => void;
    readonly undo: () => void;
}
interface CommandHistory4 {
    readonly stack: readonly Command4[];
    readonly cursor: number;
}
function createCommandHistory4(): CommandHistory4 {
    const h: CommandHistory4 = { stack: [], cursor: -1 };
    return h;
}
function executeCommand4(history: CommandHistory4, command: Command4): CommandHistory4 {
    const stack = history.stack.slice(0, history.cursor + 1);
    command.execute();
    const next: CommandHistory4 = { stack: [...stack, command], cursor: history.cursor + 1 };
    return next;
}
function undoCommand4(history: CommandHistory4): CommandHistory4 {
    if (history.cursor < 0) { return history; }
    history.stack[history.cursor]?.undo();
    const prev: CommandHistory4 = { stack: history.stack, cursor: history.cursor - 1 };
    return prev;
}
function redoCommand4(history: CommandHistory4): CommandHistory4 {
    if (history.cursor >= history.stack.length - 1) { return history; }
    const idx = history.cursor + 1;
    history.stack[idx]?.execute();
    const fwd: CommandHistory4 = { stack: history.stack, cursor: idx };
    return fwd;
}
function createMoveEntityCommand4(
    world: ReturnType<typeof createWorld>,
    eid: number,
    oldX: number,
    oldY: number,
    newX: number,
    newY: number
): Command4 {
    const cmd: Command4 = {
        execute: () => setPosition(world, eid, newX, newY),
        undo: () => setPosition(world, eid, oldX, oldY),
    };
    return cmd;
}

const world2 = createWorld();
const entity2 = addEntity(world2);
setPosition(world2, entity2, 5, 5);

let history2 = createCommandHistory4();

// Execute command (adds to history)
const cmd4 = createMoveEntityCommand4(world2, entity2, 5, 5, 10, 10);
history2 = executeCommand4(history2, cmd4);

// Undo
history2 = undoCommand4(history2);  // Entity moves back to (5, 5)

// Redo
history2 = redoCommand4(history2);  // Entity moves to (10, 10)
```

### Complete Example

```typescript
// Text editing commands using functional pattern - self-contained example

// Command and history types
interface TextCommand {
    readonly execute: () => void;
    readonly undo: () => void;
}
interface TextCommandHistory {
    readonly stack: readonly TextCommand[];
    readonly cursor: number;
}
function createTextCommandHistory(): TextCommandHistory {
    const h: TextCommandHistory = { stack: [], cursor: -1 };
    return h;
}
function executeTextCommand(history: TextCommandHistory, command: TextCommand): TextCommandHistory {
    const stack = history.stack.slice(0, history.cursor + 1);
    command.execute();
    const next: TextCommandHistory = { stack: [...stack, command], cursor: history.cursor + 1 };
    return next;
}
function undoTextCommand(history: TextCommandHistory): TextCommandHistory {
    if (history.cursor < 0) { return history; }
    history.stack[history.cursor]?.undo();
    const prev: TextCommandHistory = { stack: history.stack, cursor: history.cursor - 1 };
    return prev;
}
function redoTextCommand(history: TextCommandHistory): TextCommandHistory {
    if (history.cursor >= history.stack.length - 1) { return history; }
    const idx = history.cursor + 1;
    history.stack[idx]?.execute();
    const fwd: TextCommandHistory = { stack: history.stack, cursor: idx };
    return fwd;
}

function createInsertTextCommand(
    text: string,
    position: number,
    buffer: string[]
): TextCommand {
    const cmd: TextCommand = {
        execute: () => { buffer.splice(position, 0, text); },
        undo: () => { buffer.splice(position, 1); },
    };
    return cmd;
}

function createDeleteTextCommand(
    position: number,
    buffer: string[]
): TextCommand {
    let deletedText: string | undefined;
    const cmd: TextCommand = {
        execute: () => {
            deletedText = buffer[position];
            buffer.splice(position, 1);
        },
        undo: () => {
            if (deletedText !== undefined) {
                buffer.splice(position, 0, deletedText);
            }
        },
    };
    return cmd;
}

// Usage
const textBuffer: string[] = [];
let textHistory = createTextCommandHistory();

// Type some text
textHistory = executeTextCommand(textHistory, createInsertTextCommand('H', 0, textBuffer));
textHistory = executeTextCommand(textHistory, createInsertTextCommand('e', 1, textBuffer));
textHistory = executeTextCommand(textHistory, createInsertTextCommand('l', 2, textBuffer));
textHistory = executeTextCommand(textHistory, createInsertTextCommand('l', 3, textBuffer));
textHistory = executeTextCommand(textHistory, createInsertTextCommand('o', 4, textBuffer));

console.log(textBuffer.join(''));  // "Hello"

// Undo twice
textHistory = undoTextCommand(textHistory);
textHistory = undoTextCommand(textHistory);
console.log(textBuffer.join(''));  // "Hel"

// Redo once
textHistory = redoTextCommand(textHistory);
console.log(textBuffer.join(''));  // "Hell"
```

### Common Pitfalls

- **Forgetting to clear forward history**: When executing new command after undo
- **Deep copying state**: Commands should store minimal state, not entire world
- **Memory leaks**: Limit history size or implement cleanup

### See Also

- [Command Pattern](https://refactoring.guru/design-patterns/command)

---

## Persist UI State

### Goal
Save and restore UI state across application sessions.

### Prerequisites
- Understanding of component serialization

### Steps

**1. Define serializable state**

```typescript
interface SerializedEntity {
  readonly id: Entity;
  readonly position?: { readonly x: number; readonly y: number; readonly z: number };
  readonly dimensions?: { readonly width: number; readonly height: number };
  readonly visible?: boolean;
  readonly zIndex?: number;
}

interface AppState {
  readonly entities: readonly SerializedEntity[];
  readonly focusedEntity: Entity | null;
  readonly version: string;
}
```

**2. Serialize current state**

```typescript
import { hasComponent } from 'blecsd/core';
import { query } from 'blecsd/core';
import { Position, Dimensions, Renderable } from 'blecsd/components';

function serializeState(world: World): AppState {
  const entities: SerializedEntity[] = [];
  const allEntities = query(world, [Position]);

  for (const eid of allEntities) {
    const entity: SerializedEntity = {
      id: eid,
    };

    if (hasComponent(world, eid, Position)) {
      entity.position = {
        x: Position.x[eid] ?? 0,
        y: Position.y[eid] ?? 0,
        z: Position.z[eid] ?? 0,
      };
    }

    if (hasComponent(world, eid, Dimensions)) {
      entity.dimensions = {
        width: Dimensions.width[eid] ?? 0,
        height: Dimensions.height[eid] ?? 0,
      };
    }

    if (hasComponent(world, eid, Renderable)) {
      entity.visible = Renderable.visible[eid] === 1;
    }

    entity.zIndex = getZIndex(world, eid);

    entities.push(entity);
  }

  return {
    entities,
    focusedEntity: getFocused(world),
    version: '1.0.0',
  };
}
```

**3. Save to file**

```typescript
import { writeFileSync } from 'node:fs';

function saveState(world: World, filename: string): void {
  const state = serializeState(world);
  const json = JSON.stringify(state, null, 2);
  writeFileSync(filename, json, 'utf-8');
}
```

**4. Load from file**

```typescript
import { readFileSync } from 'node:fs';
import { addEntity } from 'blecsd/core';
import { setPosition, setDimensions, setZIndex } from 'blecsd/components';
import { Renderable } from 'blecsd/components';
import { focusEntity } from 'blecsd/components';

function loadState(world: World, filename: string): void {
  const json = readFileSync(filename, 'utf-8');
  const state: AppState = JSON.parse(json);

  // Restore entities
  for (const serialized of state.entities) {
    const eid = addEntity(world);

    if (serialized.position) {
      setPosition(world, eid,
        serialized.position.x,
        serialized.position.y,
        serialized.position.z
      );
    }

    if (serialized.dimensions) {
      setDimensions(world, eid,
        serialized.dimensions.width,
        serialized.dimensions.height
      );
    }

    if (serialized.visible !== undefined) {
      Renderable.visible[eid] = serialized.visible ? 1 : 0;
    }

    if (serialized.zIndex !== undefined) {
      setZIndex(world, eid, serialized.zIndex);
    }
  }

  // Restore focus
  if (state.focusedEntity !== null) {
    focusEntity(world, state.focusedEntity);
  }
}
```

### Complete Example

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, setDimensions } from 'blecsd/components';
import { Position, Dimensions } from 'blecsd/components';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

// [Include serialize/deserialize functions from above]

const world = createWorld();
const stateFile = './app-state.json';

// Load state if exists
if (existsSync(stateFile)) {
  console.log('Loading saved state...');
  loadState(world, stateFile);
} else {
  console.log('No saved state, creating fresh...');

  // Create initial entities
  const box1 = addEntity(world);
  setPosition(world, box1, 5, 5);
  setDimensions(world, box1, 10, 5);

  const box2 = addEntity(world);
  setPosition(world, box2, 20, 10);
  setDimensions(world, box2, 15, 8);
}

// Save state on exit
process.on('exit', () => {
  console.log('Saving state...');
  saveState(world, stateFile);
});

// Save state on Ctrl+S
const eventBus = getInputEventBus();
eventBus.on('keypress', (event) => {
  if (event.name === 's' && event.ctrl) {
    console.log('Saving state...');
    saveState(world, stateFile);
  }
});
```

### Common Pitfalls

- **Entity ID reuse**: IDs might change between sessions
- **Version compatibility**: Add version field and handle migrations
- **Sensitive data**: Don't serialize passwords or tokens

### See Also

- [State Management Patterns](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape)

---

## Create a Plugin System

### Goal
Enable third-party extensions to your application.

### Prerequisites
- Understanding of ECS systems
- Familiarity with TypeScript interfaces

### Steps

**1. Define plugin interface**

```typescript
import type { World, System } from 'blecsd/core';
import { LoopPhase } from 'blecsd/core';

interface PluginCommand {
  readonly name: string;
  readonly description: string;
  execute(args: string[]): void;
}

interface Plugin {
  readonly name: string;
  readonly version: string;

  install(world: World): void;
  uninstall?(world: World): void;

  getSystems?(): readonly { phase: LoopPhase; system: System }[];
  getCommands?(): readonly PluginCommand[];
}
```

**2. Create plugin manager**

```typescript
import { createWorld } from 'blecsd/core';
import type { World } from 'blecsd/core';

interface PluginRegistry {
    readonly plugins: ReadonlyMap<string, Plugin>;
}

function createPluginRegistry(): PluginRegistry {
    const r: PluginRegistry = { plugins: new Map() };
    return r;
}

function registerPlugin(
    registry: PluginRegistry,
    plugin: Plugin,
    world: World
): PluginRegistry {
    if (registry.plugins.has(plugin.name)) {
        throw new Error(`Plugin ${plugin.name} already registered`);
    }
    const plugins = new Map(registry.plugins);
    plugins.set(plugin.name, plugin);
    plugin.install(world);
    const r: PluginRegistry = { plugins };
    return r;
}

function unregisterPlugin(
    registry: PluginRegistry,
    name: string,
    world: World
): PluginRegistry {
    const plugin = registry.plugins.get(name);
    if (!plugin) { return registry; }
    if (plugin.uninstall) {
        plugin.uninstall(world);
    }
    const plugins = new Map(registry.plugins);
    plugins.delete(name);
    const r: PluginRegistry = { plugins };
    return r;
}

function listPlugins(registry: PluginRegistry): readonly Plugin[] {
    return Array.from(registry.plugins.values());
}
```

**3. Create example plugin**

```typescript
import { createWorld } from 'blecsd/core';
import type { World } from 'blecsd/core';

const autosavePlugin: Plugin = {
  name: 'autosave',
  version: '1.0.0',

  install: (world: World) => {
    console.log('Autosave plugin installed');
    // Start autosave timer (store interval ref externally to support uninstall)
  },

  uninstall: (_world: World) => {
    console.log('Autosave plugin uninstalled');
  },

  getCommands: (): readonly PluginCommand[] => {
    return [
      {
        name: 'autosave',
        description: 'Toggle autosave',
        execute: (_args: string[]) => {
          // Toggle autosave
        },
      },
    ];
  },
};
```

**4. Load plugins**

```typescript
import { createWorld } from 'blecsd/core';
import type { World } from 'blecsd/core';

// Self-contained plugin registry for this example
interface PluginRegistry4 {
    readonly plugins: ReadonlyMap<string, Plugin>;
}
function createPluginRegistry4(): PluginRegistry4 {
    const r: PluginRegistry4 = { plugins: new Map() };
    return r;
}
function registerPlugin4(registry: PluginRegistry4, plugin: Plugin, world: World): PluginRegistry4 {
    const plugins = new Map(registry.plugins);
    plugins.set(plugin.name, plugin);
    plugin.install(world);
    const r: PluginRegistry4 = { plugins };
    return r;
}
function listPlugins4(registry: PluginRegistry4): readonly Plugin[] {
    return Array.from(registry.plugins.values());
}

// Example autosave plugin for this block
const autosavePlugin4: Plugin = {
    name: 'autosave',
    version: '1.0.0',
    install: (_world: World) => { console.log('Autosave installed'); },
    getCommands: (): readonly PluginCommand[] => { return []; },
};

const plugWorld = createWorld();
let registry4 = createPluginRegistry4();

// Register built-in plugins
registry4 = registerPlugin4(registry4, autosavePlugin4, plugWorld);

// List plugins
for (const plugin of listPlugins4(registry4)) {
    console.log(`Loaded: ${plugin.name} v${plugin.version}`);
}
```

### Complete Example

```typescript
import { createWorld } from 'blecsd/core';
import type { World } from 'blecsd/core';

// Self-contained plugin registry
interface PluginRegistryEx {
    readonly plugins: ReadonlyMap<string, Plugin>;
}
function createPluginRegistryEx(): PluginRegistryEx {
    const r: PluginRegistryEx = { plugins: new Map() };
    return r;
}
function registerPluginEx(registry: PluginRegistryEx, plugin: Plugin, world: World): PluginRegistryEx {
    const plugins = new Map(registry.plugins);
    plugins.set(plugin.name, plugin);
    plugin.install(world);
    const r: PluginRegistryEx = { plugins };
    return r;
}
function listPluginsEx(registry: PluginRegistryEx): readonly Plugin[] {
    return Array.from(registry.plugins.values());
}

// Theme plugin
function applyTheme(theme: string): void {
    console.log(`Applying theme: ${theme}`);
}

const themePlugin: Plugin = {
    name: 'theme',
    version: '1.0.0',

    install: (_world: World) => {
        applyTheme('dark');
    },

    getCommands: (): readonly PluginCommand[] => {
        return [
            {
                name: 'theme',
                description: 'Change theme (light/dark)',
                execute: (args: string[]) => {
                    const theme = args[0];
                    if (theme === 'light' || theme === 'dark') {
                        applyTheme(theme);
                    } else {
                        console.error('Invalid theme. Use: light or dark');
                    }
                },
            },
        ];
    },
};

// Initialize with a fresh world
const exWorld = createWorld();
let exRegistry = createPluginRegistryEx();
exRegistry = registerPluginEx(exRegistry, themePlugin, exWorld);

// List loaded plugins
for (const plugin of listPluginsEx(exRegistry)) {
    console.log(`Loaded: ${plugin.name} v${plugin.version}`);
}
```

### Common Pitfalls

- **No uninstall logic**: Plugins leave state behind when removed
- **Name collisions**: Two plugins with same name
- **Plugin dependencies**: Plugin A depends on Plugin B but load order wrong

### See Also

- [Plugin Architecture](https://www.patterns.dev/posts/plugin-pattern/)

---

## Integrate with External Renderers

### Goal
Use blECSd's ECS and widgets with custom rendering output (web canvas, image files, etc.).

### Prerequisites
- Understanding of rendering pipeline
- Library-first design principles

### Steps

**1. Skip output system**

Don't register `outputSystem` - render manually instead:

```typescript
import { inputSystem, layoutSystem, renderSystem } from 'blecsd/systems';
import { createGameLoop, LoopPhase, createWorld } from 'blecsd/core';

const extWorld = createWorld();
const loop = createGameLoop(extWorld, { targetFPS: 60 });

// Register everything EXCEPT outputSystem
loop.registerInputSystem(inputSystem);
loop.registerSystem(LoopPhase.LAYOUT, layoutSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);
// NO outputSystem
```

**2. Read render buffer**

```typescript
import { getRenderBuffer } from 'blecsd/systems';

const buffer = getRenderBuffer();
if (!buffer) {
    console.error('No render buffer');
} else {
    // Buffer structure:
    // buffer.width, buffer.height
    // buffer.cells[y * width + x] = { char, fg, bg, attrs }
    console.log('Buffer ready', buffer);
}
```

**3. Convert to your format**

<!-- blecsd-doccheck:ignore -->
```typescript
// Example: Render to HTML Canvas (browser environment, uses canvas API)
function renderToCanvas(buffer: ScreenBufferData, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cellWidth = 8;
  const cellHeight = 16;

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const cell = buffer.cells[y * buffer.width + x];
      if (!cell) continue;

      // Draw background
      ctx.fillStyle = colorToHex(cell.bg);
      ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);

      // Draw character
      ctx.fillStyle = colorToHex(cell.fg);
      ctx.font = '16px monospace';
      ctx.fillText(
        String.fromCharCode(cell.char),
        x * cellWidth,
        (y + 1) * cellHeight - 2
      );
    }
  }
}

function colorToHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
```

**4. Call in your render loop**

<!-- blecsd-doccheck:ignore -->
```typescript
// Browser-specific: requestAnimationFrame and HTMLCanvasElement
function gameLoop(): void {
  // Run ECS systems (updates buffer internally)
  scheduler.run(world, deltaTime);

  // Read buffer and render to canvas
  const buffer = getRenderBuffer();
  if (buffer) {
    renderToCanvas(buffer, canvas);
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
```

### Complete Example

<!-- blecsd-doccheck:ignore -->
```typescript
// Complete example combining blECSd ECS with Node canvas (third-party library)
// This demonstrates integration with an external renderer
import {
  createWorld,
  addEntity,
  addComponent,
  createGameLoop,
  LoopPhase,
} from 'blecsd/core';
import { setPosition, setDimensions, setStyle } from 'blecsd/components';
import { layoutSystem, renderSystem, getRenderBuffer } from 'blecsd/systems';

const world = createWorld();

// Create entities
const box = addEntity(world);
setPosition(world, box, 5, 5);
setDimensions(world, box, 10, 5);
setStyle(world, box, { fg: 0xFF0000, bg: 0x000000 });

// Setup ECS (no outputSystem)
const loop = createGameLoop(world, { targetFPS: 60 });
loop.registerSystem(LoopPhase.LAYOUT, layoutSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);

// Custom renderer: Write to image file using Node canvas (third-party)
import { createCanvas } from 'canvas';  // npm install canvas
import { writeFileSync } from 'node:fs';

function renderToImage(buffer, filename) {
  const cellWidth = 10;
  const cellHeight = 20;
  const canvas = createCanvas(buffer.width * cellWidth, buffer.height * cellHeight);
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const cell = buffer.cells[y * buffer.width + x];
      if (!cell) continue;
      ctx.fillStyle = `#${cell.bg.toString(16).padStart(6, '0')}`;
      ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
      ctx.fillStyle = `#${cell.fg.toString(16).padStart(6, '0')}`;
      ctx.font = `${cellHeight}px monospace`;
      ctx.fillText(String.fromCharCode(cell.char), x * cellWidth + 2, (y + 1) * cellHeight - 4);
    }
  }

  writeFileSync(filename, canvas.toBuffer('image/png'));
}

// Render once
loop.start();
const buffer = getRenderBuffer();
if (buffer) {
  renderToImage(buffer, './output.png');
  console.log('Rendered to output.png');
}
```

### Common Pitfalls

- **Registering outputSystem**: Conflicts with custom rendering
- **Not running layout system**: Positions won't be computed
- **Buffer format confusion**: Remember it's row-major (y * width + x)

### See Also

- [Examples Repository](https://github.com/Kadajett/blECSd-Examples)
- [Library-First Design](../../CLAUDE.md#library-first-design-hard-requirement)

---

## Optimize Performance

### Goal
Diagnose and fix performance issues in your blECSd application.

### Prerequisites
- Familiarity with profiling tools
- Understanding of rendering pipeline

### Quick Checklist

When experiencing performance issues, check:

1. **✓ Profile first**
   ```typescript
   import { createFrameBudgetManager, getFrameBudgetStats } from 'blecsd/systems';

   createFrameBudgetManager({ targetFrameMs: 16.67 });
   const { stats } = getFrameBudgetStats();
   console.log(`FPS: ${stats.avgFps.toFixed(1)}`);
   ```

2. **✓ Cache queries**
   ```typescript
   // ❌ SLOW
   function system(world: World): World {
     const entities = query(world, [Position, Renderable]);  // Every frame!
     // ...
   }

   // ✅ FAST
   const entities = query(world, [Position, Renderable]);  // Once
   function system(world: World): World {
     for (const eid of entities) {
       // ...
     }
   }
   ```

3. **✓ Use virtualization for long lists**
   ```typescript
   import { createVirtualizedList } from 'blecsd/widgets';

   // Handles 1M+ items at 60 FPS
   const vlist = createVirtualizedList(world, entity, {
     itemCount: 1000000,
     viewportHeight: 20,
     renderItem: (index) => `Item ${index}`,
   });
   ```

4. **✓ Avoid allocations in hot paths**
   ```typescript
   // ❌ SLOW: Object allocation every frame
   for (const eid of entities) {
     const pos = { x: Position.x[eid], y: Position.y[eid] };  // Alloc!
     render(pos);
   }

   // ✅ FAST: Direct access
   const { x, y } = Position;
   for (const eid of entities) {
     render(x[eid]!, y[eid]!);  // No alloc
   }
   ```

5. **✓ Mark only changed entities dirty**
   ```typescript
   // ❌ SLOW
   for (const eid of entities) {
     markDirty(world, eid);  // Every entity every frame
   }

   // ✅ FAST
   for (const eid of entities) {
     if (hasChanged(eid)) {
       markDirty(world, eid);  // Only when changed
     }
   }
   ```

### See Full Guide

For detailed optimization techniques with measured performance impacts, see:
- **[Performance Guide](./performance.md)** - Complete optimization guide with benchmarks

---

## Write Custom ECS Systems

### Goal
Create custom systems that integrate with blECSd's ECS architecture.

### Prerequisites
- Understanding of ECS concepts
- Familiarity with query API

### Steps

**1. Define your system function**

```typescript
import { type World, query, createWorld } from 'blecsd/core';

function myCustomSystem(world: World): World {
    // System logic here
    return world;
}

// Example usage
const csWorld = createWorld();
myCustomSystem(csWorld);
```

**2. Query for entities**

```typescript
import { query } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';
import type { World } from 'blecsd/core';

function movementSystem(world: World): World {
    const entities = query(world, [Position, Velocity]);
    for (const eid of entities) {
        Position.x[eid] = (Position.x[eid] ?? 0) + (Velocity.x[eid] ?? 0);
        Position.y[eid] = (Position.y[eid] ?? 0) + (Velocity.y[eid] ?? 0);
    }
    return world;
}
```

**3. Register to game loop**

```typescript
import { LoopPhase, createGameLoop, createWorld } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';
import { query } from 'blecsd/core';
import type { World } from 'blecsd/core';

function movementSystem2(world: World): World {
    const entities = query(world, [Position, Velocity]);
    for (const eid of entities) {
        Position.x[eid] = (Position.x[eid] ?? 0) + (Velocity.x[eid] ?? 0);
        Position.y[eid] = (Position.y[eid] ?? 0) + (Velocity.y[eid] ?? 0);
    }
    return world;
}

const regWorld = createWorld();
const regLoop = createGameLoop(regWorld, { targetFPS: 60 });
regLoop.registerSystem(LoopPhase.UPDATE, movementSystem2);
```

### Complete Example

```typescript
import { createWorld, addEntity, query, createGameLoop, LoopPhase } from 'blecsd/core';
import { setPosition, Position } from 'blecsd/components';
import type { World } from 'blecsd/core';

// Define custom component (using typed arrays directly)
const Health = {
    current: new Float32Array(10000),
    max: new Float32Array(10000),
};

const Damage = {
    amount: new Float32Array(10000),
    tick: new Uint32Array(10000),
};

// Custom system: Apply damage over time
function damageSystem(world: World): World {
    const entities = query(world, [Position]);
    for (const eid of entities) {
        if (!Health.current[eid] && !Damage.amount[eid]) { continue; }
        const dmg = Damage.amount[eid] ?? 0;
        const current = Health.current[eid] ?? 0;
        Health.current[eid] = Math.max(0, current - dmg);
        if (Health.current[eid] === 0) {
            console.log(`Entity ${eid} died!`);
        }
    }
    return world;
}

// Create world
const ecsWorld = createWorld();

// Create entity with health
const player = addEntity(ecsWorld);
setPosition(ecsWorld, player, 10, 10);
Health.current[player] = 100;
Health.max[player] = 100;
Damage.amount[player] = 1;  // 1 HP per frame

// Register system
const ecsLoop = createGameLoop(ecsWorld, { targetFPS: 60 });
ecsLoop.registerSystem(LoopPhase.UPDATE, damageSystem);

// Note: call ecsLoop.start() in a real app to run the loop
```

### Best Practices

1. **Keep systems pure** - No side effects except to world state
2. **Use queries** - Don't iterate all entities manually
3. **Batch operations** - Process all entities in one pass
4. **Respect phases** - Input → Update → Layout → Render
5. **Profile** - Use frame budget system to track performance

### See Also

- [Understanding ECS](./understanding-ecs.md)
- [Systems API](../api/systems.md)
- [Performance Guide](./performance.md)

---

## Integrate with Other ECS Libraries

### Goal
Use blECSd components and widgets in your existing bitecs application.

### Prerequisites
- Understanding of bitecs architecture
- Library-first design principles

### Steps

**1. Import components**

```typescript
// Your existing bitecs world
import { createWorld as createBitecsWorld, addEntity } from 'blecsd/core';
const bitecsWorld = createBitecsWorld();

// Import blECSd components
import { Position, Velocity } from 'blecsd/components';

// Create an entity
const bitecsEntity = addEntity(bitecsWorld);

// Works! blECSd components are just bitecs components
Position.x[bitecsEntity] = 10;
Velocity.x[bitecsEntity] = 5;
```

**2. Use blECSd systems manually**

```typescript
import { createWorld as createBitecsWorld2 } from 'blecsd/core';
import { layoutSystem, renderSystem } from 'blecsd/systems';
import type { World } from 'blecsd/core';

const bitecsWorld2 = createBitecsWorld2();

// Stub custom systems for illustration
function physicsSystem(_world: World): void {}
function collisionSystem(_world: World): void {}

// In your game loop
function update(): void {
    // Your systems
    physicsSystem(bitecsWorld2);
    collisionSystem(bitecsWorld2);

    // blECSd systems
    layoutSystem(bitecsWorld2);
    renderSystem(bitecsWorld2);
}
```

**3. Use blECSd widgets**

```typescript
import { createWorld as createBitecsWorld3, addEntity } from 'blecsd/core';
import { setPosition } from 'blecsd/components';
import { createBox } from 'blecsd/widgets';

const bitecsWorld3 = createBitecsWorld3();

// Your custom component (plain typed arrays - no special import needed)
const MyCustomComponent = {
    value: new Int32Array(10000),
};

// Create entity with your ECS
const bitecsEntity3 = addEntity(bitecsWorld3);

// Use blECSd widget factory
const box = createBox(bitecsWorld3, bitecsEntity3, {
    width: 20,
    height: 10,
    borderStyle: 'single',
});

// Both your components and blECSd components coexist
MyCustomComponent.value[bitecsEntity3] = 42;
```

### Complete Example

```typescript
import { createWorld as createBitecsWorldEx, addEntity } from 'blecsd/core';
import { layoutSystem, renderSystem } from 'blecsd/systems';
import { setPosition, Velocity } from 'blecsd/components';
import type { World } from 'blecsd/core';

// Your bitecs world
const bitecsWorldEx = createBitecsWorldEx();

// Your custom components (using typed arrays directly)
const MyComponent = {
    value: new Int32Array(10000),
};

// Create entity
const entityEx = addEntity(bitecsWorldEx);

// Mix your components with blECSd components
MyComponent.value[entityEx] = 100;
setPosition(bitecsWorldEx, entityEx, 5, 5);
Velocity.x[entityEx] = 1;

// Your system
function mySystemEx(world: World): World {
    // Process your components
    for (let eid = 0; eid < 1000; eid++) {
        if (MyComponent.value[eid]) {
            MyComponent.value[eid] += 1;
        }
    }
    return world;
}

// Run systems once (in a real app, call from your game loop)
mySystemEx(bitecsWorldEx);
layoutSystem(bitecsWorldEx);
renderSystem(bitecsWorldEx);
console.log('Systems ran, entity value:', MyComponent.value[entityEx]);
```

### Common Pitfalls

- **Type incompatibility**: Ensure both use same bitecs version
- **System order**: blECSd expects INPUT → UPDATE → LAYOUT → RENDER
- **Component registration**: Register components before using

### See Also

- [Library-First Design](../../CLAUDE.md#library-first-design-hard-requirement)
- [Examples Repository](https://github.com/Kadajett/blECSd-Examples)

---

## Build a Theme System

### Goal
Create a reusable theme system for consistent styling.

### Prerequisites
- Understanding of component values

### Steps

**1. Define theme interface**

```typescript
interface Theme {
  readonly name: string;
  readonly colors: {
    readonly primary: number;
    readonly secondary: number;
    readonly background: number;
    readonly text: number;
    readonly border: number;
    readonly accent: number;
  };
  readonly borders: {
    readonly style: 'single' | 'double' | 'rounded';
  };
}
```

**2. Create theme definitions**

```typescript
const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: 0x00FF00,
    secondary: 0x00FFFF,
    background: 0x000000,
    text: 0xFFFFFF,
    border: 0x333333,
    accent: 0xFF00FF,
  },
  borders: {
    style: 'single',
  },
};

const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: 0x0000FF,
    secondary: 0x00AAFF,
    background: 0xFFFFFF,
    text: 0x000000,
    border: 0xCCCCCC,
    accent: 0xFF6600,
  },
  borders: {
    style: 'rounded',
  },
};
```

**3. Apply theme to entities**

```typescript
import { query } from 'blecsd/core';
import { getRenderable, setRenderable, hasRenderable } from 'blecsd/components';
import type { World } from 'blecsd/core';

function applyThemeToWorld(world: World, theme: Theme): void {
  // Theme application: iterate renderables and update their colors
  // (In a full app you'd query entities by Renderable component)
  console.log(`Applying theme: ${theme.name}`);
}
```

**4. Create theme manager**

```typescript
import type { World } from 'blecsd/core';

interface Theme4 {
    readonly name: string;
    readonly colors: { readonly primary: number; readonly text: number };
}
interface ThemeRegistry {
    readonly themes: ReadonlyMap<string, Theme4>;
    readonly current: Theme4;
}

function applyThemeToWorld4(_world: World, theme: Theme4): void {
    console.log(`Applying theme: ${theme.name}`);
}

function createThemeRegistry(defaultTheme: Theme4): ThemeRegistry {
    const r: ThemeRegistry = { themes: new Map([[defaultTheme.name, defaultTheme]]), current: defaultTheme };
    return r;
}

function registerTheme(registry: ThemeRegistry, theme: Theme4): ThemeRegistry {
    const themes = new Map(registry.themes);
    themes.set(theme.name, theme);
    const r: ThemeRegistry = { themes, current: registry.current };
    return r;
}

function applyThemeByName(registry: ThemeRegistry, world: World, themeName: string): { registry: ThemeRegistry; applied: boolean } {
    const theme = registry.themes.get(themeName);
    if (!theme) { return { registry, applied: false }; }
    applyThemeToWorld4(world, theme);
    const r: ThemeRegistry = { themes: registry.themes, current: theme };
    return { registry: r, applied: true };
}

function listThemes(registry: ThemeRegistry): readonly string[] {
    return Array.from(registry.themes.keys());
}
```

### Complete Example

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition } from 'blecsd/components';
import type { World } from 'blecsd/core';

// Theme system - self-contained
interface ThemeEx {
    readonly name: string;
    readonly colors: { readonly primary: number; readonly text: number };
}
interface ThemeRegistryEx {
    readonly themes: ReadonlyMap<string, ThemeEx>;
    readonly current: ThemeEx;
}
function applyThemeToWorldEx(_world: World, theme: ThemeEx): void {
    console.log(`Applying theme: ${theme.name}`);
}
function createThemeRegistryEx(defaultTheme: ThemeEx): ThemeRegistryEx {
    const r: ThemeRegistryEx = { themes: new Map([[defaultTheme.name, defaultTheme]]), current: defaultTheme };
    return r;
}
function registerThemeEx(registry: ThemeRegistryEx, theme: ThemeEx): ThemeRegistryEx {
    const themes = new Map(registry.themes);
    themes.set(theme.name, theme);
    const r: ThemeRegistryEx = { themes, current: registry.current };
    return r;
}
function applyThemeByNameEx(registry: ThemeRegistryEx, world: World, themeName: string): { registry: ThemeRegistryEx; applied: boolean } {
    const theme = registry.themes.get(themeName);
    if (!theme) { return { registry, applied: false }; }
    applyThemeToWorldEx(world, theme);
    const r: ThemeRegistryEx = { themes: registry.themes, current: theme };
    return { registry: r, applied: true };
}
function listThemesEx(registry: ThemeRegistryEx): readonly string[] {
    return Array.from(registry.themes.keys());
}

const darkThemeEx: ThemeEx = { name: 'dark', colors: { primary: 0x00FF00, text: 0xFFFFFF } };
const lightThemeEx: ThemeEx = { name: 'light', colors: { primary: 0x0000FF, text: 0x000000 } };

const themeWorld = createWorld();
let themeRegistry = createThemeRegistryEx(darkThemeEx);

// Register themes
themeRegistry = registerThemeEx(themeRegistry, darkThemeEx);
themeRegistry = registerThemeEx(themeRegistry, lightThemeEx);

// Create UI
const themePanel = addEntity(themeWorld);
setPosition(themeWorld, themePanel, 5, 5);
console.log(`Using theme: ${themeRegistry.current.name}`);
console.log(`Available themes: ${listThemesEx(themeRegistry).join(', ')}`);

// Switch theme
const result = applyThemeByNameEx(themeRegistry, themeWorld, 'light');
if (result.applied) {
    themeRegistry = result.registry;
    console.log(`Switched to ${themeRegistry.current.name} theme`);
}
```

### Common Pitfalls

- **Not marking entities dirty**: Theme changes won't render
- **Hardcoded colors**: Use theme values everywhere
- **No theme persistence**: Save current theme to state file

### See Also

- [Material Design Color System](https://material.io/design/color/)

---

## Implement Accessibility Features

### Goal
Make your blECSd application accessible to users with disabilities.

### Prerequisites
- Understanding of accessibility principles

### Key Features to Implement

### 1. Screen Reader Support

```typescript
import { createWorld, addEntity, query } from 'blecsd/core';
import { setPosition, setDimensions, Position } from 'blecsd/components';
import { getInputEventBus } from 'blecsd/systems';
import type { World, Entity } from 'blecsd/core';

// Custom accessible label store (plain typed arrays)
const AccessibleLabel: Record<number, string> = {};
const AccessibleRole: Record<number, string> = {};

function setAccessibleLabel(eid: Entity, label: string): void {
    AccessibleLabel[eid] = label;
}
function setAccessibleRole(eid: Entity, role: string): void {
    AccessibleRole[eid] = role;
}

// Export to screen reader
function exportToScreenReader(world: World): string {
    const entities = query(world, [Position]);
    const output: string[] = [];
    for (const eid of entities) {
        const label = AccessibleLabel[eid];
        const role = AccessibleRole[eid];
        if (label) {
            output.push(role ? `${role}: ${label}` : label);
        }
    }
    return output.join(', ');
}

// Example usage
const srWorld = createWorld();
const btn = addEntity(srWorld);
setPosition(srWorld, btn, 5, 5);
setAccessibleLabel(btn, 'Save');
setAccessibleRole(btn, 'button');
console.log(exportToScreenReader(srWorld));
```

### 2. Keyboard Navigation

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setInteractive, setFocusable, focusNext, focusPrev } from 'blecsd/components';
import { getInputEventBus } from 'blecsd/systems';

const navWorld = createWorld();
const navBtn = addEntity(navWorld);

// Ensure all interactive elements are keyboard-accessible
setInteractive(navWorld, navBtn, { enabled: true });
setFocusable(navWorld, navBtn, true);

// Implement tab navigation
const eventBus2 = getInputEventBus();
eventBus2.on('keypress', (event: { name: string; shift?: boolean }) => {
    if (event.name === 'tab') {
        if (event.shift) {
            focusPrev(navWorld);
        } else {
            focusNext(navWorld);
        }
    }
});
```

### 3. High Contrast Mode

```typescript
// Define a high contrast color palette (plain object, no special import needed)
const highContrastColors = {
    primary: 0xFFFF00,      // Bright yellow
    secondary: 0x00FFFF,    // Bright cyan
    background: 0x000000,   // Black
    text: 0xFFFFFF,         // White
    border: 0xFFFFFF,       // White
    accent: 0xFF00FF,       // Bright magenta
};

console.log('High contrast mode colors:', highContrastColors);
```

### 4. Configurable Accessibility Settings

```typescript
import { createWorld } from 'blecsd/core';
import type { World } from 'blecsd/core';

interface AccessibilitySettings {
    highContrast: boolean;
    reduceMotion: boolean;
}

function applyAccessibilitySettings(
    _world: World,
    settings: AccessibilitySettings
): void {
    if (settings.highContrast) {
        console.log('High contrast mode enabled');
        // Apply high contrast colors to all renderable entities
    }
    if (settings.reduceMotion) {
        console.log('Reduce motion enabled');
        // Disable animations globally
    }
}

const a11yWorld = createWorld();
applyAccessibilitySettings(a11yWorld, { highContrast: true, reduceMotion: false });
```

### 5. Screen Reader Announcements

```typescript
function announce(message: string): void {
    // Write to screen reader buffer
    process.stdout.write(`\x1b[2K\r${message}\r\n`);
}

// Usage
announce('Button activated');
```

### Complete Accessible App Example

```typescript
import { type World, type Entity } from 'blecsd/core';
import { createWorld, addEntity, createGameLoop } from 'blecsd/core';
import { getInputEventBus } from 'blecsd/systems';
import {
    setPosition,
    setDimensions,
    focusNext,
    focusPrev,
    setInteractive,
    setFocusable,
    getFocusedEntity,
} from 'blecsd/components';

// Accessible label store
const A11yLabel: Record<number, string> = {};

function setA11yLabel(eid: Entity, label: string): void {
    A11yLabel[eid] = label;
}
function getA11yLabel(eid: Entity): string {
    return A11yLabel[eid] ?? '';
}

const a11yWorld = createWorld();

function announceMsg(message: string): void {
    process.stdout.write(`\x1b[2K\r${message}\r\n`);
}

// Create accessible button
function createAccessibleButton(
    world: World,
    x: number,
    y: number,
    label: string
): Entity {
    const button = addEntity(world);
    setPosition(world, button, x, y);
    setDimensions(world, button, label.length + 4, 3);
    setInteractive(world, button, { enabled: true });
    setFocusable(world, button, true);
    setA11yLabel(button, label);
    return button;
}

// Create UI
const saveBtn = createAccessibleButton(a11yWorld, 5, 5, 'Save');
const loadBtn = createAccessibleButton(a11yWorld, 5, 9, 'Load');
const quitBtn = createAccessibleButton(a11yWorld, 5, 13, 'Quit');

// Setup keyboard navigation
const a11yBus = getInputEventBus();

a11yBus.on('keypress', (event: { name: string; shift?: boolean }) => {
    if (event.name === 'tab') {
        if (event.shift) {
            focusPrev(a11yWorld);
        } else {
            focusNext(a11yWorld);
        }
        const focused = getFocusedEntity(a11yWorld);
        if (focused !== null) {
            announceMsg(`Focused: ${getA11yLabel(focused)}`);
        }
    } else if (event.name === 'enter' || event.name === 'space') {
        const focused = getFocusedEntity(a11yWorld);
        if (focused !== null) {
            announceMsg(`Activated: ${getA11yLabel(focused)}`);
        }
    }
});

// Note: call loop.start() in a real app to run the event loop
const a11yLoop = createGameLoop(a11yWorld, { targetFPS: 60 });
console.log('Accessible app setup complete with', [saveBtn, loadBtn, quitBtn].length, 'buttons');
```

### Accessibility Checklist

- [ ] All interactive elements keyboard-accessible
- [ ] Semantic labels for screen readers
- [ ] High contrast mode available
- [ ] Reduced motion option
- [ ] Tab navigation working
- [ ] Focus indicators visible
- [ ] Announce important events
- [ ] Document keyboard shortcuts

### See Also

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Keyboard Shortcuts Guide](./keyboard-shortcuts.md)

---

## Related Documentation

- [Understanding ECS](./understanding-ecs.md)
- [Performance Guide](./performance.md)
- [Testing Guide](./testing.md)
- [API Reference](../api/)
- [Examples Repository](https://github.com/Kadajett/blECSd-Examples)
