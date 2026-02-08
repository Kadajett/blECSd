# How-To Guides

Practical, task-oriented guides for common blECSd operations.

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
import { parseKeyEvent, queueKeyEvent } from 'blecsd';

// Enable raw mode for key capture
process.stdin.setRawMode(true);
process.stdin.resume();

// Parse and queue events
process.stdin.on('data', (buffer) => {
  const keyEvent = parseKeyEvent(buffer);
  if (keyEvent) {
    queueKeyEvent(keyEvent);
  }
});
```

**2. Process events in the input system**

The `inputSystem` automatically processes queued events. Just add it to your scheduler:

```typescript
import { createScheduler, LoopPhase, inputSystem } from 'blecsd';

const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.INPUT, inputSystem);
```

**3. Listen for key events**

```typescript
import { getInputEventBus } from 'blecsd';

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
import {
  createWorld,
  createScheduler,
  LoopPhase,
  inputSystem,
  parseKeyEvent,
  queueKeyEvent,
  getInputEventBus,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler(world, { targetFPS: 60 });

// Register input system
scheduler.addSystem(LoopPhase.INPUT, inputSystem);

// Setup keyboard capture
process.stdin.setRawMode(true);
process.stdin.resume();

process.stdin.on('data', (buffer) => {
  const keyEvent = parseKeyEvent(buffer);
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
scheduler.start();
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
import { parseMouseEvent, queueMouseEvent } from 'blecsd';

process.stdin.setRawMode(true);
process.stdin.resume();

// Enable mouse tracking in terminal
process.stdout.write('\x1b[?1000h');  // Normal tracking
process.stdout.write('\x1b[?1003h');  // Any event tracking

process.stdin.on('data', (buffer) => {
  const mouseEvent = parseMouseEvent(buffer);
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
import { addEntity, setPosition, setDimensions, Interactive } from 'blecsd';

const button = addEntity(world);
setPosition(world, button, 10, 5);
setDimensions(world, button, 15, 3);
Interactive.enabled[button] = 1;  // Make it clickable
```

**3. Listen for click events**

```typescript
import { getInputEventBus } from 'blecsd';

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
  setPosition,
  setDimensions,
  setRenderable,
  Interactive,
  createScheduler,
  LoopPhase,
  inputSystem,
  renderSystem,
  outputSystem,
  parseMouseEvent,
  queueMouseEvent,
  getInputEventBus,
} from 'blecsd';

const world = createWorld();

// Create clickable button
const button = addEntity(world);
setPosition(world, button, 10, 5);
setDimensions(world, button, 15, 3);
setRenderable(world, button, { char: ' ', fg: 0xFFFFFF, bg: 0x0000FF });
Interactive.enabled[button] = 1;

// Setup mouse tracking
process.stdin.setRawMode(true);
process.stdout.write('\x1b[?1000h');

process.stdin.on('data', (buffer) => {
  const mouseEvent = parseMouseEvent(buffer);
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
const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.INPUT, inputSystem);
scheduler.addSystem(LoopPhase.RENDER, renderSystem);
scheduler.addSystem(LoopPhase.POST_RENDER, outputSystem);

scheduler.start();

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
import {
  addEntity,
  setPosition,
  setDimensions,
  setRenderable,
  type World,
  type Entity,
} from 'blecsd';

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
  setRenderable(world, entity, {
    char: ' ',
    fg: 0xFFFFFF,
    bg: fullOptions.bgColor,
  });

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
import { query, Position, Dimensions, Renderable } from 'blecsd';

function progressBarRenderSystem(world: World): World {
  const entities = query(world, [Position, Dimensions, Renderable]);

  for (const eid of entities) {
    const state = progressBarStateMap.get(eid);
    if (!state) continue;

    const width = Dimensions.width[eid] ?? 0;
    const filledWidth = Math.floor((width * state.value) / 100);

    // Render bar (simplified)
    for (let x = 0; x < width; x++) {
      const color = x < filledWidth ? state.options.barColor : state.options.bgColor;
      Renderable.bg[eid] = color;
    }
  }

  return world;
}
```

**4. Register system**

```typescript
scheduler.addSystem(LoopPhase.RENDER, progressBarRenderSystem);
```

### Complete Example

```typescript
import {
  createWorld,
  addEntity,
  setPosition,
  createScheduler,
  LoopPhase,
  renderSystem,
  outputSystem,
} from 'blecsd';

// [Include factory and render system from above]

const world = createWorld();
const progressEntity = addEntity(world);

setPosition(world, progressEntity, 5, 5);
const progressBar = createProgressBar(world, progressEntity, {
  width: 30,
  barColor: 0x00FF00,
  showLabel: true,
});

const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.RENDER, progressBarRenderSystem);
scheduler.addSystem(LoopPhase.RENDER, renderSystem);
scheduler.addSystem(LoopPhase.POST_RENDER, outputSystem);

// Animate progress
let progress = 0;
scheduler.addSystem(LoopPhase.UPDATE, (world) => {
  progress = (progress + 1) % 101;
  progressBar.update(progress);
  return world;
});

scheduler.start();
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
import { hasComponent, Position, Renderable, isEffectivelyVisible } from 'blecsd';

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
import { ZIndex } from 'blecsd';

ZIndex.value[frontEntity] = 10;  // Higher = front
ZIndex.value[backEntity] = 5;    // Lower = back
```

### Issue 3: Partial Renders

**Symptoms:** Only part of entity visible or cut off.

**Solutions:**
1. **Check clipping:** Entity might be clipped by parent bounds
2. **Check dimensions:** Dimensions might be too small
3. **Check scroll offsets:** Parent might be scrolled

```typescript
import { getComputedBounds, Scroll } from 'blecsd';

const bounds = getComputedBounds(world, eid);
console.log('Computed bounds:', bounds);

const parent = Hierarchy.parent[eid];
if (parent) {
  console.log('Parent scroll:', Scroll.x[parent], Scroll.y[parent]);
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
import { query, Position, Dimensions } from 'blecsd';

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
import { getFrameBudgetStats } from 'blecsd';

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
import { getInputEventBus, captureMouseTo, Position } from 'blecsd';

const eventBus = getInputEventBus();

eventBus.on('mousedown', (event) => {
  if (event.entity) {
    dragState.dragging = true;
    dragState.entity = event.entity;

    // Store offset from entity origin
    const ex = Position.x[event.entity] ?? 0;
    const ey = Position.y[event.entity] ?? 0;
    dragState.offsetX = event.x - ex;
    dragState.offsetY = event.y - ey;

    // Capture all mouse events to this entity
    captureMouseTo(event.entity);
  }
});
```

**3. Handle mouse move (update position)**

```typescript
eventBus.on('mousemove', (event) => {
  if (dragState.dragging && dragState.entity !== null) {
    // Update entity position
    Position.x[dragState.entity] = event.x - dragState.offsetX;
    Position.y[dragState.entity] = event.y - dragState.offsetY;

    // Mark dirty for re-render
    markDirty(world, dragState.entity);
  }
});
```

**4. Handle mouse up (end drag)**

```typescript
import { releaseMouse } from 'blecsd';

eventBus.on('mouseup', (event) => {
  if (dragState.dragging) {
    dragState.dragging = false;
    dragState.entity = null;
    releaseMouse();
  }
});
```

### Complete Example

```typescript
import {
  createWorld,
  addEntity,
  setPosition,
  setDimensions,
  setRenderable,
  Interactive,
  Position,
  createScheduler,
  LoopPhase,
  inputSystem,
  renderSystem,
  outputSystem,
  parseMouseEvent,
  queueMouseEvent,
  getInputEventBus,
  captureMouseTo,
  releaseMouse,
  markDirty,
} from 'blecsd';

const world = createWorld();

// Create draggable box
const box = addEntity(world);
setPosition(world, box, 10, 5);
setDimensions(world, box, 10, 5);
setRenderable(world, box, { char: ' ', fg: 0xFFFFFF, bg: 0xFF0000 });
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
  const mouseEvent = parseMouseEvent(buffer);
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
const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.INPUT, inputSystem);
scheduler.addSystem(LoopPhase.RENDER, renderSystem);
scheduler.addSystem(LoopPhase.POST_RENDER, outputSystem);

scheduler.start();
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
import { addEntity, setPosition, setDimensions, setRenderable, ZIndex } from 'blecsd';

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
  setRenderable(world, overlay, {
    char: ' ',
    fg: 0x000000,
    bg: 0x000000,
  });
  ZIndex.value[overlay] = 100;  // Above normal UI

  // Create dialog box
  const dialog = addEntity(world);
  const x = Math.floor((80 - width) / 2);
  const y = Math.floor((24 - height) / 2);
  setPosition(world, dialog, x, y);
  setDimensions(world, dialog, width, height);
  setRenderable(world, dialog, {
    char: ' ',
    fg: 0x000000,
    bg: 0xFFFFFF,
  });
  ZIndex.value[dialog] = 101;  // Above overlay

  return dialog;
}
```

**2. Save and restore focus**

```typescript
import { focusPush, focusPop, focusEntity } from 'blecsd';

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
// The focus system automatically blocks input to non-focused entities
// when a modal has focus. Just ensure Interactive.enabled is set:

Interactive.enabled[modalEntity] = 1;
Interactive.focusable[modalEntity] = 1;
```

### Complete Example

```typescript
import {
  createWorld,
  addEntity,
  setPosition,
  setDimensions,
  setRenderable,
  ZIndex,
  Interactive,
  createScheduler,
  LoopPhase,
  inputSystem,
  focusSystem,
  renderSystem,
  outputSystem,
  focusPush,
  focusPop,
  focusEntity,
  getInputEventBus,
  parseKeyEvent,
  queueKeyEvent,
} from 'blecsd';

const world = createWorld();

// Create main UI
const mainPanel = addEntity(world);
setPosition(world, mainPanel, 5, 5);
setDimensions(world, mainPanel, 30, 10);
setRenderable(world, mainPanel, { char: ' ', fg: 0x000000, bg: 0x00FF00 });

// Function to create modal
function createModal(world: World): Entity {
  // Overlay
  const overlay = addEntity(world);
  setPosition(world, overlay, 0, 0);
  setDimensions(world, overlay, 80, 24);
  setRenderable(world, overlay, { char: ' ', fg: 0x000000, bg: 0x000000 });
  ZIndex.value[overlay] = 100;

  // Dialog
  const dialog = addEntity(world);
  setPosition(world, dialog, 20, 8);
  setDimensions(world, dialog, 40, 8);
  setRenderable(world, dialog, { char: ' ', fg: 0x000000, bg: 0xFFFFFF });
  Interactive.enabled[dialog] = 1;
  Interactive.focusable[dialog] = 1;
  ZIndex.value[dialog] = 101;

  return dialog;
}

// Setup keyboard handling
process.stdin.setRawMode(true);
process.stdin.on('data', (buffer) => {
  const keyEvent = parseKeyEvent(buffer);
  if (keyEvent) {
    queueKeyEvent(keyEvent);
  }
});

const eventBus = getInputEventBus();

eventBus.on('keypress', (event) => {
  if (event.name === 'm') {
    // Show modal
    const modal = createModal(world);
    focusPush(world);
    focusEntity(world, modal);
  } else if (event.name === 'escape') {
    // Close modal
    focusPop(world);
    // TODO: Remove modal entities
  }
});

// Setup rendering
const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.INPUT, inputSystem);
scheduler.addSystem(LoopPhase.UPDATE, focusSystem);
scheduler.addSystem(LoopPhase.RENDER, renderSystem);
scheduler.addSystem(LoopPhase.POST_RENDER, outputSystem);

scheduler.start();
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
import { type ParsedKeyEvent } from 'blecsd';

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
import { getInputEventBus } from 'blecsd';

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
import {
  createWorld,
  createScheduler,
  LoopPhase,
  inputSystem,
  parseKeyEvent,
  queueKeyEvent,
  getInputEventBus,
  type ParsedKeyEvent,
} from 'blecsd';

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
  const keyEvent = parseKeyEvent(buffer);
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

// Setup scheduler
const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.INPUT, inputSystem);
scheduler.start();
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

```typescript
import { createVirtualizedList } from 'blecsd';

const listEntity = addEntity(world);
setPosition(world, listEntity, 5, 2);

const vlist = createVirtualizedList(world, listEntity, {
  itemCount: 1000000,  // One million items!
  itemHeight: 1,
  viewportHeight: 20,  // Only 20 visible at once
  renderItem: (index) => `Item ${index}`,
});
```

**2. Handle dynamic data**

```typescript
import { createVirtualizedList } from 'blecsd';

const data: string[] = loadLargeDataset();  // 100,000 items

const vlist = createVirtualizedList(world, listEntity, {
  itemCount: data.length,
  itemHeight: 1,
  viewportHeight: 20,
  renderItem: (index) => {
    // Only called for visible items
    return data[index] ?? '';
  },
});
```

**3. Update dynamically**

```typescript
// Update item count when data changes
vlist.setItemCount(data.length);

// Scroll to specific item
vlist.scrollToIndex(5000);

// Get current scroll position
const scrollTop = vlist.getScrollTop();
```

### Complete Example

```typescript
import {
  createWorld,
  addEntity,
  setPosition,
  createVirtualizedList,
  createScheduler,
  LoopPhase,
  renderSystem,
  outputSystem,
  parseKeyEvent,
  queueKeyEvent,
  inputSystem,
  getInputEventBus,
} from 'blecsd';

const world = createWorld();

// Generate large dataset
const data: string[] = [];
for (let i = 0; i < 1000000; i++) {
  data.push(`Item ${i}: ${Math.random().toString(36).substring(7)}`);
}

// Create virtualized list
const listEntity = addEntity(world);
setPosition(world, listEntity, 2, 2);

const vlist = createVirtualizedList(world, listEntity, {
  itemCount: data.length,
  itemHeight: 1,
  viewportHeight: 20,
  renderItem: (index) => data[index] ?? '',
});

// Handle keyboard scrolling
process.stdin.setRawMode(true);
process.stdin.on('data', (buffer) => {
  const keyEvent = parseKeyEvent(buffer);
  if (keyEvent) {
    queueKeyEvent(keyEvent);
  }
});

const eventBus = getInputEventBus();

eventBus.on('keypress', (event) => {
  if (event.name === 'up') {
    vlist.scrollBy(-1);
  } else if (event.name === 'down') {
    vlist.scrollBy(1);
  } else if (event.name === 'pageup') {
    vlist.scrollBy(-20);
  } else if (event.name === 'pagedown') {
    vlist.scrollBy(20);
  } else if (event.name === 'home') {
    vlist.scrollToIndex(0);
  } else if (event.name === 'end') {
    vlist.scrollToIndex(data.length - 1);
  }
});

// Setup rendering
const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.INPUT, inputSystem);
scheduler.addSystem(LoopPhase.RENDER, renderSystem);
scheduler.addSystem(LoopPhase.POST_RENDER, outputSystem);

scheduler.start();
```

**Performance:** Renders 1,000,000 items at 60 FPS by only rendering 20 visible items.

### Common Pitfalls

- **Fixed-height assumption**: All items must have same height (configurable)
- **Expensive renderItem**: Keep render function fast, cache if needed
- **Not handling updates**: Call `setItemCount()` when data changes

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

**1. Define command interface**

```typescript
interface Command {
  execute(): void;
  undo(): void;
  redo(): void;
}
```

**2. Implement command history**

```typescript
class CommandHistory {
  private history: Command[] = [];
  private current = -1;

  execute(command: Command): void {
    // Remove any commands after current position
    this.history = this.history.slice(0, this.current + 1);

    // Execute and add to history
    command.execute();
    this.history.push(command);
    this.current++;
  }

  undo(): boolean {
    if (this.current < 0) return false;

    this.history[this.current]?.undo();
    this.current--;
    return true;
  }

  redo(): boolean {
    if (this.current >= this.history.length - 1) return false;

    this.current++;
    this.history[this.current]?.redo();
    return true;
  }

  canUndo(): boolean {
    return this.current >= 0;
  }

  canRedo(): boolean {
    return this.current < this.history.length - 1;
  }
}
```

**3. Create specific commands**

```typescript
import { Position } from 'blecsd';

class MoveEntityCommand implements Command {
  constructor(
    private readonly entity: Entity,
    private readonly oldX: number,
    private readonly oldY: number,
    private readonly newX: number,
    private readonly newY: number
  ) {}

  execute(): void {
    Position.x[this.entity] = this.newX;
    Position.y[this.entity] = this.newY;
  }

  undo(): void {
    Position.x[this.entity] = this.oldX;
    Position.y[this.entity] = this.oldY;
  }

  redo(): void {
    this.execute();
  }
}
```

**4. Use commands in your app**

```typescript
const history = new CommandHistory();

// Execute command (adds to history)
const cmd = new MoveEntityCommand(entity, 5, 5, 10, 10);
history.execute(cmd);

// Undo
history.undo();  // Entity moves back to (5, 5)

// Redo
history.redo();  // Entity moves to (10, 10)
```

### Complete Example

```typescript
// [Include Command interface and CommandHistory from above]

// Text editing command
class InsertTextCommand implements Command {
  constructor(
    private text: string,
    private position: number,
    private buffer: string[]
  ) {}

  execute(): void {
    this.buffer.splice(this.position, 0, this.text);
  }

  undo(): void {
    this.buffer.splice(this.position, 1);
  }

  redo(): void {
    this.execute();
  }
}

class DeleteTextCommand implements Command {
  private deletedText: string | undefined;

  constructor(
    private position: number,
    private buffer: string[]
  ) {}

  execute(): void {
    this.deletedText = this.buffer[this.position];
    this.buffer.splice(this.position, 1);
  }

  undo(): void {
    if (this.deletedText) {
      this.buffer.splice(this.position, 0, this.deletedText);
    }
  }

  redo(): void {
    this.execute();
  }
}

// Usage
const buffer: string[] = [];
const history = new CommandHistory();

// Type some text
history.execute(new InsertTextCommand('H', 0, buffer));
history.execute(new InsertTextCommand('e', 1, buffer));
history.execute(new InsertTextCommand('l', 2, buffer));
history.execute(new InsertTextCommand('l', 3, buffer));
history.execute(new InsertTextCommand('o', 4, buffer));

console.log(buffer.join(''));  // "Hello"

// Undo twice
history.undo();
history.undo();
console.log(buffer.join(''));  // "Hel"

// Redo once
history.redo();
console.log(buffer.join(''));  // "Hell"

// Wire up to keyboard
eventBus.on('keypress', (event) => {
  if (event.name === 'z' && event.ctrl) {
    if (event.shift) {
      history.redo();
    } else {
      history.undo();
    }
  }
});
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
import { query, Position, Dimensions, Renderable, ZIndex, getFocused } from 'blecsd';

function serializeState(world: World): AppState {
  const entities: SerializedEntity[] = [];
  const allEntities = query(world, [Position]);

  for (const eid of allEntities) {
    const entity: SerializedEntity = {
      id: eid,
    };

    if (hasComponent(world, Position, eid)) {
      entity.position = {
        x: Position.x[eid] ?? 0,
        y: Position.y[eid] ?? 0,
        z: Position.z[eid] ?? 0,
      };
    }

    if (hasComponent(world, Dimensions, eid)) {
      entity.dimensions = {
        width: Dimensions.width[eid] ?? 0,
        height: Dimensions.height[eid] ?? 0,
      };
    }

    if (hasComponent(world, Renderable, eid)) {
      entity.visible = Renderable.visible[eid] === 1;
    }

    if (hasComponent(world, ZIndex, eid)) {
      entity.zIndex = ZIndex.value[eid];
    }

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
import { addEntity, setPosition, setDimensions, focusEntity } from 'blecsd';

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
      ZIndex.value[eid] = serialized.zIndex;
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
import {
  createWorld,
  addEntity,
  setPosition,
  setDimensions,
  Position,
  Dimensions,
} from 'blecsd';
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
import type { World, System } from 'blecsd';

interface Plugin {
  readonly name: string;
  readonly version: string;

  install(world: World): void;
  uninstall?(world: World): void;

  getSystems?(): readonly { phase: LoopPhase; system: System }[];
  getCommands?(): readonly Command[];
}

interface Command {
  readonly name: string;
  readonly description: string;
  execute(args: string[]): void;
}
```

**2. Create plugin manager**

```typescript
class PluginManager {
  private plugins = new Map<string, Plugin>();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} already registered`);
    }

    this.plugins.set(plugin.name, plugin);
    plugin.install(this.world);

    // Register systems
    if (plugin.getSystems) {
      for (const { phase, system } of plugin.getSystems()) {
        this.scheduler.addSystem(phase, system);
      }
    }
  }

  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    if (plugin.uninstall) {
      plugin.uninstall(this.world);
    }

    this.plugins.delete(name);
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  list(): readonly Plugin[] {
    return Array.from(this.plugins.values());
  }
}
```

**3. Create example plugin**

```typescript
import type { Plugin } from './plugin-interface';

const autosavePlugin: Plugin = {
  name: 'autosave',
  version: '1.0.0',

  install(world: World): void {
    console.log('Autosave plugin installed');

    // Start autosave timer
    setInterval(() => {
      console.log('Autosaving...');
      saveState(world, './autosave.json');
    }, 60000);  // Every minute
  },

  uninstall(world: World): void {
    console.log('Autosave plugin uninstalled');
    // Clear interval (would need to store interval ID)
  },

  getCommands(): readonly Command[] {
    return [
      {
        name: 'autosave',
        description: 'Toggle autosave',
        execute(args: string[]): void {
          // Toggle autosave
        },
      },
    ];
  },
};
```

**4. Load plugins**

```typescript
const pluginManager = new PluginManager(world, scheduler);

// Register built-in plugins
pluginManager.register(autosavePlugin);

// Load external plugins
import('./plugins/my-plugin.js').then((module) => {
  pluginManager.register(module.default);
});
```

### Complete Example

```typescript
// [Include Plugin interface and PluginManager from above]

// Theme plugin
const themePlugin: Plugin = {
  name: 'theme',
  version: '1.0.0',

  install(world: World): void {
    // Apply default theme
    applyTheme('dark');
  },

  getCommands(): readonly Command[] {
    return [
      {
        name: 'theme',
        description: 'Change theme (light/dark)',
        execute(args: string[]): void {
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

// Debug overlay plugin
const debugPlugin: Plugin = {
  name: 'debug-overlay',
  version: '1.0.0',

  install(world: World): void {
    // Create debug overlay entity
  },

  getSystems(): readonly { phase: LoopPhase; system: System }[] {
    return [
      {
        phase: LoopPhase.RENDER,
        system: debugOverlaySystem,
      },
    ];
  },

  getCommands(): readonly Command[] {
    return [
      {
        name: 'debug',
        description: 'Toggle debug overlay',
        execute(): void {
          toggleDebugOverlay();
        },
      },
    ];
  },
};

// Initialize
const pluginManager = new PluginManager(world, scheduler);
pluginManager.register(themePlugin);
pluginManager.register(debugPlugin);

// List loaded plugins
for (const plugin of pluginManager.list()) {
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
import { createScheduler, LoopPhase, inputSystem, layoutSystem, renderSystem } from 'blecsd';

const scheduler = createScheduler(world, { targetFPS: 60 });

// Register everything EXCEPT outputSystem
scheduler.addSystem(LoopPhase.INPUT, inputSystem);
scheduler.addSystem(LoopPhase.LAYOUT, layoutSystem);
scheduler.addSystem(LoopPhase.RENDER, renderSystem);
// NO outputSystem
```

**2. Read render buffer**

```typescript
import { getRenderBuffer } from 'blecsd';

const buffer = getRenderBuffer(world);
if (!buffer) {
  console.error('No render buffer');
  return;
}

// Buffer structure:
// buffer.width, buffer.height
// buffer.cells[y * width + x] = { char, fg, bg, attrs }
```

**3. Convert to your format**

```typescript
// Example: Render to HTML Canvas
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

```typescript
function gameLoop(): void {
  // Run ECS systems (updates buffer internally)
  scheduler.run(world, deltaTime);

  // Read buffer and render to canvas
  const buffer = getRenderBuffer(world);
  if (buffer) {
    renderToCanvas(buffer, canvas);
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
```

### Complete Example

```typescript
import {
  createWorld,
  addEntity,
  setPosition,
  setDimensions,
  setRenderable,
  createScheduler,
  LoopPhase,
  layoutSystem,
  renderSystem,
  getRenderBuffer,
  type ScreenBufferData,
} from 'blecsd';

const world = createWorld();

// Create entities
const box = addEntity(world);
setPosition(world, box, 5, 5);
setDimensions(world, box, 10, 5);
setRenderable(world, box, { char: 88, fg: 0xFF0000, bg: 0x000000 });  // Red 'X'

// Setup ECS (no outputSystem)
const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.LAYOUT, layoutSystem);
scheduler.addSystem(LoopPhase.RENDER, renderSystem);

// Custom renderer: Write to image file
import { createCanvas } from 'canvas';
import { writeFileSync } from 'node:fs';

function renderToImage(buffer: ScreenBufferData, filename: string): void {
  const cellWidth = 10;
  const cellHeight = 20;

  const canvas = createCanvas(
    buffer.width * cellWidth,
    buffer.height * cellHeight
  );
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const cell = buffer.cells[y * buffer.width + x];
      if (!cell) continue;

      // Background
      ctx.fillStyle = `#${cell.bg.toString(16).padStart(6, '0')}`;
      ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);

      // Character
      ctx.fillStyle = `#${cell.fg.toString(16).padStart(6, '0')}`;
      ctx.font = `${cellHeight}px monospace`;
      ctx.fillText(
        String.fromCharCode(cell.char),
        x * cellWidth + 2,
        (y + 1) * cellHeight - 4
      );
    }
  }

  writeFileSync(filename, canvas.toBuffer('image/png'));
}

// Render once
scheduler.run(world, 0.016);
const buffer = getRenderBuffer(world);
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

- [Standalone Components Example](../examples/standalone-components.md)
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
   import { createFrameBudgetManager, getFrameBudgetStats } from 'blecsd';

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
   import { createVirtualizedList } from 'blecsd';

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
import { query, type World, type System } from 'blecsd';

function myCustomSystem(world: World): World {
  // System logic here
  return world;
}
```

**2. Query for entities**

```typescript
import { query, Position, Velocity } from 'blecsd';

function movementSystem(world: World): World {
  const entities = query(world, [Position, Velocity]);

  for (const eid of entities) {
    Position.x[eid] = (Position.x[eid] ?? 0) + (Velocity.x[eid] ?? 0);
    Position.y[eid] = (Position.y[eid] ?? 0) + (Velocity.y[eid] ?? 0);
  }

  return world;
}
```

**3. Register to scheduler**

```typescript
import { LoopPhase } from 'blecsd';

scheduler.addSystem(LoopPhase.UPDATE, movementSystem);
```

### Complete Example

```typescript
import {
  createWorld,
  addEntity,
  query,
  defineComponent,
  Types,
  setPosition,
  Position,
  createScheduler,
  LoopPhase,
  type World,
} from 'blecsd';

// Define custom component
const Health = defineComponent({
  current: Types.f32,
  max: Types.f32,
});

const Damage = defineComponent({
  amount: Types.f32,
  tick: Types.ui32,
});

// Custom system: Apply damage over time
function damageSystem(world: World): World {
  const entities = query(world, [Health, Damage]);

  for (const eid of entities) {
    // Apply damage
    const dmg = Damage.amount[eid] ?? 0;
    const current = Health.current[eid] ?? 0;

    Health.current[eid] = Math.max(0, current - dmg);

    // Check if dead
    if (Health.current[eid] === 0) {
      console.log(`Entity ${eid} died!`);
      // Could remove entity or mark as dead
    }
  }

  return world;
}

// Create world
const world = createWorld();

// Create entity with health
const player = addEntity(world);
setPosition(world, player, 10, 10);
Health.current[player] = 100;
Health.max[player] = 100;
Damage.amount[player] = 1;  // 1 HP per frame

// Register system
const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.UPDATE, damageSystem);

scheduler.start();
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
import { createWorld as createBitecsWorld } from 'bitecs';
const world = createBitecsWorld();

// Import blECSd components
import { Position, Velocity, Dimensions } from 'blecsd';

// Works! blECSd components are just bitecs components
Position.x[entity] = 10;
Velocity.x[entity] = 5;
```

**2. Use blECSd systems manually**

```typescript
import { layoutSystem, renderSystem } from 'blecsd';

// In your game loop
function update(): void {
  // Your systems
  physicsSystem(world);
  collisionSystem(world);

  // blECSd systems
  layoutSystem(world);
  renderSystem(world);
}
```

**3. Use blECSd widgets**

```typescript
import { addEntity } from 'bitecs';
import { createBox, setPosition } from 'blecsd';

// Create entity with your ECS
const entity = addEntity(world);

// Use blECSd widget factory
const box = createBox(world, entity, {
  width: 20,
  height: 10,
  borderStyle: 'single',
});

// Both your components and blECSd components coexist
MyCustomComponent.value[entity] = 42;
```

### Complete Example

```typescript
import { createWorld as createBitecsWorld, addEntity, defineComponent, Types } from 'bitecs';
import { Position, Velocity, layoutSystem, renderSystem, setPosition } from 'blecsd';

// Your bitecs world
const world = createBitecsWorld();

// Your custom components
const MyComponent = defineComponent({
  value: Types.i32,
});

// Create entity
const entity = addEntity(world);

// Mix your components with blECSd components
MyComponent.value[entity] = 100;
setPosition(world, entity, 5, 5);
Velocity.x[entity] = 1;

// Your system
function mySystem(world: any): any {
  // Process your components
  for (let eid = 0; eid < 1000; eid++) {
    if (MyComponent.value[eid]) {
      MyComponent.value[eid] += 1;
    }
  }
  return world;
}

// Game loop mixing both
function gameLoop(): void {
  // Your systems
  mySystem(world);

  // blECSd systems
  layoutSystem(world);
  renderSystem(world);

  requestAnimationFrame(gameLoop);
}

gameLoop();
```

### Common Pitfalls

- **Type incompatibility**: Ensure both use same bitecs version
- **System order**: blECSd expects INPUT → UPDATE → LAYOUT → RENDER
- **Component registration**: Register components before using

### See Also

- [Library-First Design](../../CLAUDE.md#library-first-design-hard-requirement)
- [Standalone Components](../examples/standalone-components.md)

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
import { query, Renderable, Border } from 'blecsd';

function applyTheme(world: World, theme: Theme): void {
  // Update all renderable entities
  const renderables = query(world, [Renderable]);

  for (const eid of renderables) {
    Renderable.bg[eid] = theme.colors.background;
    Renderable.fg[eid] = theme.colors.text;
  }

  // Update all borders
  const bordered = query(world, [Border]);

  for (const eid of bordered) {
    Border.color[eid] = theme.colors.border;
    // Note: Border style might need custom component
  }
}
```

**4. Create theme manager**

```typescript
class ThemeManager {
  private themes = new Map<string, Theme>();
  private currentTheme: Theme;

  constructor(defaultTheme: Theme) {
    this.currentTheme = defaultTheme;
  }

  register(theme: Theme): void {
    this.themes.set(theme.name, theme);
  }

  apply(world: World, themeName: string): boolean {
    const theme = this.themes.get(themeName);
    if (!theme) return false;

    this.currentTheme = theme;
    applyTheme(world, theme);
    return true;
  }

  getCurrent(): Theme {
    return this.currentTheme;
  }

  list(): readonly string[] {
    return Array.from(this.themes.keys());
  }
}
```

### Complete Example

```typescript
// [Include Theme interface and theme definitions from above]

const world = createWorld();
const themeManager = new ThemeManager(darkTheme);

// Register themes
themeManager.register(darkTheme);
themeManager.register(lightTheme);

// Create UI
const panel = addEntity(world);
setPosition(world, panel, 5, 5);
setDimensions(world, panel, 30, 10);
setRenderable(world, panel, {
  char: 32,
  fg: darkTheme.colors.text,
  bg: darkTheme.colors.background,
});

// Switch themes
eventBus.on('keypress', (event) => {
  if (event.name === 't') {
    const currentName = themeManager.getCurrent().name;
    const nextTheme = currentName === 'dark' ? 'light' : 'dark';

    if (themeManager.apply(world, nextTheme)) {
      console.log(`Switched to ${nextTheme} theme`);
    }
  }
});
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
// Add semantic labels to entities
const Accessible = defineComponent({
  role: Types.ui8,        // 0=button, 1=input, 2=list, etc.
  label: Types.ui32,      // String ID
  description: Types.ui32,
});

function setAccessibleLabel(world: World, eid: Entity, label: string): void {
  const id = registerString(label);
  Accessible.label[eid] = id;
}

// Export to screen reader
function exportToScreenReader(world: World): string {
  const accessible = query(world, [Accessible, Position]);

  const output: string[] = [];
  for (const eid of accessible) {
    const label = getString(Accessible.label[eid]);
    const role = getRoleName(Accessible.role[eid]);
    output.push(`${role}: ${label}`);
  }

  return output.join(', ');
}
```

### 2. Keyboard Navigation

```typescript
// Ensure all interactive elements are keyboard-accessible
Interactive.focusable[button] = 1;
Interactive.tabIndex[button] = 1;

// Implement arrow key navigation
eventBus.on('keypress', (event) => {
  if (event.name === 'tab') {
    if (event.shift) {
      focusPrev(world);
    } else {
      focusNext(world);
    }
  }
});
```

### 3. High Contrast Mode

```typescript
const highContrastTheme: Theme = {
  name: 'high-contrast',
  colors: {
    primary: 0xFFFF00,      // Bright yellow
    secondary: 0x00FFFF,    // Bright cyan
    background: 0x000000,   // Black
    text: 0xFFFFFF,         // White
    border: 0xFFFFFF,       // White
    accent: 0xFF00FF,       // Bright magenta
  },
  borders: {
    style: 'double',  // More visible
  },
};
```

### 4. Configurable Font Sizes

```typescript
interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  reduceMotion: boolean;
}

function applyAccessibilitySettings(
  world: World,
  settings: AccessibilitySettings
): void {
  if (settings.highContrast) {
    applyTheme(world, highContrastTheme);
  }

  if (settings.reduceMotion) {
    // Disable animations
    disableAnimations(world);
  }

  // Font size would require terminal configuration
}
```

### 5. Screen Reader Announcements

```typescript
function announce(message: string): void {
  // Write to screen reader buffer
  process.stdout.write(`\x1b[2K\r${message}\r\n`);
}

// Usage
eventBus.on('buttonClick', (event) => {
  announce('Button activated');
});
```

### Complete Accessible App Example

```typescript
import {
  createWorld,
  addEntity,
  setPosition,
  setDimensions,
  Interactive,
  createScheduler,
  LoopPhase,
  focusNext,
  focusPrev,
  getInputEventBus,
} from 'blecsd';

const world = createWorld();

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

  // Make keyboard-accessible
  Interactive.enabled[button] = 1;
  Interactive.focusable[button] = 1;
  Interactive.tabIndex[button] = 1;

  // Add accessible label
  setAccessibleLabel(world, button, label);

  return button;
}

// Create UI
const saveBtn = createAccessibleButton(world, 5, 5, 'Save');
const loadBtn = createAccessibleButton(world, 5, 9, 'Load');
const quitBtn = createAccessibleButton(world, 5, 13, 'Quit');

// Setup keyboard navigation
const eventBus = getInputEventBus();

eventBus.on('keypress', (event) => {
  if (event.name === 'tab') {
    if (event.shift) {
      focusPrev(world);
    } else {
      focusNext(world);
    }

    const focused = getFocused(world);
    if (focused !== null) {
      const label = getAccessibleLabel(focused);
      announce(`Focused: ${label}`);
    }
  } else if (event.name === 'enter' || event.name === 'space') {
    const focused = getFocused(world);
    if (focused !== null) {
      const label = getAccessibleLabel(focused);
      announce(`Activated: ${label}`);
      // Trigger button action
    }
  }
});

// Start app
const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.start();
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
- [Standalone Components](../examples/standalone-components.md)
