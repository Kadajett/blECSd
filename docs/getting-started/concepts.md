# Core Concepts

## Library, Not Framework

blECSd does not own your update loop or world. You can:

1. Use components in your own bitECS world
2. Skip the scheduler entirely
3. Use only the parts you need
4. Integrate with existing systems

<!-- blecsd-doccheck:ignore -->
```typescript
// Your own update loop
function updateLoop() {
  processInput();
  updateUI(world);
  render(world);
  requestAnimationFrame(updateLoop);
}

// blECSd components still work
import { setPosition, getPosition } from 'blecsd';
setPosition(world, panel, x, y);
```

## Entity Component System

blECSd uses [bitECS](https://github.com/NateTheGreatt/bitECS) for its ECS implementation. The pattern separates data (components) from behavior (systems).

### Entities

An entity is an integer ID with no data or behavior.

```typescript
import { createWorld, addEntity } from 'blecsd';

const world = createWorld();
const sidebar = addEntity(world);   // Returns an integer like 1
const mainPanel = addEntity(world); // Returns 2
```

### Components

Components are typed data stores. blECSd provides components for common UI needs. You interact with them through helper functions:

```typescript
import { setPosition, getPosition, setDimensions } from 'blecsd';
import { setStyle } from 'blecsd/components';

setPosition(world, player, 10, 5);
setDimensions(world, player, 30, 10);
setStyle(world, player, { fg: '#ffffff', bold: true });

const pos = getPosition(world, player);
// { x: 10, y: 5, z: 0, absolute: false }
```

Or use namespace imports for a more organized API:

```typescript
import { position, dimensions, renderable } from 'blecsd/components';

position.set(world, player, 10, 5);
dimensions.set(world, player, { width: 30, height: 10 });
renderable.setStyle(world, player, { fg: '#ffffff' });
```

### Systems

Systems are functions that process entities with specific components. blECSd provides pre-built systems for common tasks:

```typescript
import { layoutSystem, renderSystem, outputSystem } from 'blecsd';

// Run the render pipeline manually
layoutSystem(world);   // Compute layout
renderSystem(world);   // Render to buffer
outputSystem(world);   // Flush to terminal
```

blECSd also provides pre-built queries for filtering entities:

```typescript
import { queryRenderable, filterVisible, sortByZIndex } from 'blecsd/core';

const allRenderable = queryRenderable(world);
const visibleOnly = filterVisible(world, allRenderable);
const sorted = sortByZIndex(world, visibleOnly);
```

## Optional Scheduler

The scheduler provides phase-ordered execution when you want it:

```typescript
import { createScheduler } from 'blecsd/core';
import { LoopPhase } from 'blecsd/core';

const scheduler = createScheduler();

scheduler.add(LoopPhase.UPDATE, (world, delta) => {
  // Game logic
  return world;
});

scheduler.add(LoopPhase.RENDER, (world, delta) => {
  // Drawing
  return world;
});

scheduler.start(world);
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
import { attachStateMachine, sendEvent, getState, isInState } from 'blecsd/components';

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
