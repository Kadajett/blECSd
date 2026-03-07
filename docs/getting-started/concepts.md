# Core Concepts

## Library, Not Framework

blECSd does not own your update loop or world. You can:

1. Use components in your own bitECS world
2. Skip the scheduler entirely
3. Use only the parts you need
4. Integrate with existing systems

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, getPosition } from 'blecsd/components';

const world = createWorld();
const panel = addEntity(world);

// Your own update loop
function updateLoop() {
  // processInput, updateUI, render - your own functions
  const pos = getPosition(world, panel);
  requestAnimationFrame(updateLoop);
}

// blECSd components work in your own loop
setPosition(world, panel, 10, 5);
```

## Entity Component System

blECSd uses [bitECS](https://github.com/NateTheGreatt/bitECS) for its ECS implementation. The pattern separates data (components) from behavior (systems).

### Entities

An entity is an integer ID with no data or behavior.

```typescript
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const sidebar = addEntity(world);   // Returns an integer like 1
const mainPanel = addEntity(world); // Returns 2
```

### Components

Components are typed data stores. blECSd provides components for common UI needs. You interact with them through helper functions:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, getPosition, setDimensions } from 'blecsd/components';
import { setStyle } from 'blecsd/components';

const world = createWorld();
const player = addEntity(world);

setPosition(world, player, 10, 5);
setDimensions(world, player, 30, 10);
setStyle(world, player, { fg: '#ffffff', bold: true });

const pos = getPosition(world, player);
// { x: 10, y: 5, z: 0, absolute: false }
```

Or use namespace imports for a more organized API:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { position, dimensions, renderable } from 'blecsd/components';

const world = createWorld();
const player = addEntity(world);

position.set(world, player, 10, 5);
dimensions.set(world, player, 30, 10);
renderable.setStyle(world, player, { fg: '#ffffff' });
```

### Systems

Systems are functions that process entities with specific components. blECSd provides pre-built systems for common tasks:

```typescript
import { createWorld } from 'blecsd/core';
import { createRenderPipeline } from 'blecsd';
import { layoutSystem, renderSystem, outputSystem } from 'blecsd/systems';

const world = createWorld();

// Initialize render pipeline in one call
const { cols, rows } = createRenderPipeline(process.stdout);

// Run the render pipeline
layoutSystem(world);   // Compute layout
renderSystem(world);   // Render to buffer
outputSystem(world);   // Flush to terminal
```

blECSd also provides pre-built queries for filtering entities:

```typescript
import { createWorld } from 'blecsd/core';
import { queryRenderable, filterVisible, sortByZIndex } from 'blecsd/core';

const world = createWorld();

const allRenderable = queryRenderable(world);
const visibleOnly = filterVisible(world, allRenderable);
const sorted = sortByZIndex(world, visibleOnly);
```

## Optional Scheduler

The scheduler provides phase-ordered execution when you want it:

```typescript
import { createWorld } from 'blecsd/core';
import { createScheduler, LoopPhase } from 'blecsd/core';

const world = createWorld();
const scheduler = createScheduler();

scheduler.registerSystem(LoopPhase.UPDATE, (w, delta) => {
  // Game logic
  return w;
});

scheduler.registerSystem(LoopPhase.RENDER, (w, delta) => {
  // Drawing
  return w;
});

scheduler.run(world, 16);
```

Phase execution order:

| Phase | Purpose |
|-------|---------|
| INPUT | Reserved for input processing (always first) |
| EARLY_UPDATE | Pre-update logic |
| UPDATE | Main application logic |
| LATE_UPDATE | Post-update logic |
| ANIMATION | Physics-based animations, transitions, momentum |
| LAYOUT | UI layout calculations |
| RENDER | Drawing |
| POST_RENDER | Cleanup, debug overlays |

The INPUT phase is reserved and cannot be reordered. All other phases are optional.

**Note on ANIMATION phase:** This handles physics-based UI animations like spring dynamics, momentum scrolling, bounce effects, and smooth transitions. These patterns are common in modern UIs (iOS bounce, Material Design, kinetic scrolling) and equally useful for games.

## Event Bus

Type-safe event handling:

```typescript
import { createEventBus } from 'blecsd/core';

interface AppEvents {
  'panel:resized': { width: number; height: number };
  'file:selected': { path: string; name: string };
}

const events = createEventBus<AppEvents>();

// Subscribe
const unsubscribe = events.on('panel:resized', (e) => {
  console.log(`Panel is now ${e.width}x${e.height}`);
});

// Emit
events.emit('panel:resized', { width: 80, height: 24 });

// One-time listener
events.once('file:selected', (e) => {
  // Fires once, then auto-removes
});

// Cleanup
unsubscribe();
```

## State Machines

Attach FSMs to entities for state management:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachStateMachine, sendEvent, getState, isInState } from 'blecsd/components';

const world = createWorld();
const dialog = addEntity(world);

// Example: Modal dialog states
const modalBehavior = {
  initial: 'closed',
  states: {
    closed: { on: { OPEN: 'opening' } },
    opening: { on: { ANIMATION_DONE: 'open' } },
    open: { on: { CLOSE: 'closing', SUBMIT: 'submitting' } },
    closing: { on: { ANIMATION_DONE: 'closed' } },
    submitting: { on: { SUCCESS: 'closing', ERROR: 'open' } },
  },
};

attachStateMachine(world, dialog, modalBehavior);

// Transition
sendEvent(world, dialog, 'OPEN');
getState(world, dialog);     // 'opening'
isInState(world, dialog, 'opening');  // true
```

State machines are useful for UI workflows, form validation states, loading indicators, and any element with discrete states.

## Input Handling

Use `createProgram` from `blecsd/terminal` for structured input events:

```typescript
import { createProgram } from 'blecsd/terminal';

const program = createProgram();
await program.init();

// Keyboard events
program.on('key', (event) => {
  console.log(event.name, event.ctrl, event.shift, event.meta);
});

// Mouse events (tracking enabled automatically by createProgram)
program.on('mouse', (event) => {
  console.log(event.action, event.x, event.y, event.button);
});

// Resize events
program.on('resize', (event) => {
  console.log(event.cols, event.rows);
});
```

For lower-level parsing, the terminal module also provides individual parsers:

```typescript
import { parseKeyBuffer, parseMouseSequence } from 'blecsd/terminal';
```

## Component Summary

| Component | Purpose | Key Functions | Module |
|-----------|---------|---------------|--------|
| Position | X, Y, Z coordinates | `setPosition`, `getPosition`, `moveBy` | `blecsd` + `blecsd/components` |
| Renderable | Colors, visibility | `setStyle`, `show`, `hide`, `markDirty` | `blecsd/components` |
| Dimensions | Width, height | `setDimensions`, `setConstraints` | `blecsd` + `blecsd/components` |
| Hierarchy | Parent-child trees | `setParent`, `appendChild`, `getChildren` | `blecsd/components` |
| Focusable | Keyboard focus | `focusEntity`, `blur`, `focusNext`, `focusPrev` | `blecsd/components` |
| Interactive | Mouse interaction | `setClickable`, `setHoverable`, `isPressed` | `blecsd/components` |
| Scrollable | Scroll position | `scrollTo`, `scrollBy`, `getScrollPercentage` | `blecsd/components` |
| Border | Box borders | `setBorder`, `getBorderChar` | `blecsd/components` |
| Content | Text content | `setContent`, `getContent`, `appendContent` | `blecsd/components` |
| Padding | Inner spacing | `setPadding`, `getPadding` | `blecsd/components` |
| Label | Text labels | `setLabel`, `getLabelText` | `blecsd/components` |
