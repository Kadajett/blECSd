# Migrating from blessed.js to blECSd

This guide helps you transition from the original blessed.js library to blECSd's modern ECS architecture.

## Table of Contents

1. [Why Migrate?](#why-migrate)
2. [Key Architectural Differences](#key-architectural-differences)
3. [API Mapping Reference](#api-mapping-reference)
4. [Migration Strategy](#migration-strategy)
5. [Common Patterns](#common-patterns)
6. [Widget Migration](#widget-migration)
7. [Event System Migration](#event-system-migration)
8. [Breaking Changes](#breaking-changes)
9. [Gradual Migration Path](#gradual-migration-path)

## Why Migrate?

### Problems with Original blessed.js

**blessed.js (11 years old) has significant issues:**

- ❌ **Unmaintained**: Last significant update in 2016
- ❌ **Prototypal inheritance**: Deep inheritance hierarchies are hard to debug
- ❌ **Mutable state everywhere**: Leads to subtle bugs
- ❌ **No TypeScript**: Runtime errors, poor IDE support
- ❌ **Performance issues**: Renders entire screen every frame
- ❌ **Global state**: Hard to test, impossible to run multiple UIs
- ❌ **Implicit behavior**: "Magic" behind the scenes

### Benefits of blECSd

✅ **Modern TypeScript**: Full type safety, excellent IDE support
✅ **ECS Architecture**: Composition over inheritance, pure functions
✅ **High Performance**: Dirty tracking, virtualization, 60 FPS rendering
✅ **Library-first**: Use only what you need, no framework lock-in
✅ **Testable**: Pure functions, no globals, easy mocking
✅ **Actively maintained**: Regular updates, responsive to issues
✅ **Explicit control**: You control the game loop

## Key Architectural Differences

### blessed.js: Object-Oriented

<!-- blecsd-doccheck:ignore -->
```javascript
// OLD: blessed.js (OOP)
const blessed = require('blessed');

// Global screen singleton
const screen = blessed.screen({
  smartCSR: true
});

// Inheritance-based widgets
const box = blessed.box({
  parent: screen,
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  content: 'Hello {bold}world{/bold}!',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'blue',
    border: {
      fg: '#f0f0f0'
    }
  }
});

// Mutate and render
box.setContent('New content');
screen.render();
```

### blECSd: Entity Component System

```typescript
// NEW: blECSd (ECS)
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
  setBorder,
  Renderable,
} from 'blecsd/components';
import { setText } from 'blecsd';
import { renderSystem, outputSystem } from 'blecsd/systems';

// YOU create the world (no global singleton)
const world = createWorld();

// Entities are just IDs
const box = addEntity(world);

// Components are data (no inheritance)
setPosition(world, box, 40, 12);  // Absolute position
setDimensions(world, box, 40, 12);
setText(world, box, 'Hello world!');
setBorder(world, box, { style: 'single', color: 0xf0f0f0 });
addComponent(world, box, Renderable);
Renderable.fg[box] = 0xffffff;
Renderable.bg[box] = 0x0000ff;

// YOU control the loop
const loop = createGameLoop(world, { targetFPS: 60 });
loop.registerSystem(LoopPhase.RENDER, renderSystem);
loop.registerSystem(LoopPhase.POST_RENDER, outputSystem);
loop.start();
loop.stop();
```

### Core Concept Mappings

| blessed.js Concept | blECSd Equivalent | Notes |
|-------------------|-------------------|-------|
| **Screen** | `World` | No global singleton, you create it |
| **Element** | `Entity` | Just a number (ID), not an object |
| **Properties** | `Components` | Data arrays, not object properties |
| **Methods** | `Systems` | Pure functions, not instance methods |
| **Inheritance** | **Composition** | Combine components instead of extending classes |
| **Events** | `EventBus` | Typed events, no string magic |
| **screen.render()** | **Automatic** | Scheduler calls systems for you |

## API Mapping Reference

### Basic Setup

| blessed.js | blECSd |
|-----------|--------|
| `blessed.screen()` | `createWorld()` |
| `screen.render()` | Automatic (scheduler) or manual `renderSystem(world)` |
| `screen.destroy()` | `scheduler.stop()` |
| `screen.key('q', ...)` | Use `createProgram()` from `blecsd/terminal` for key events |

### Creating Widgets

| blessed.js | blECSd |
|-----------|--------|
| `blessed.box({ ... })` | `createBox(world, entity, { ... })` from `blecsd/widgets` |
| `blessed.text({ ... })` | `createText(world, entity, { ... })` from `blecsd/widgets` |
| `blessed.list({ ... })` | `createList(world, entity, { ... })` from `blecsd/widgets` |
| `blessed.input({ ... })` | `createTextboxEntity(world, { ... })` from `blecsd/widgets` |
| `blessed.button({ ... })` | `createButtonEntity(world, { ... })` from `blecsd/widgets` |
| `blessed.table({ ... })` | `createTable(world, entity, { ... })` from `blecsd/widgets` |

### Positioning

| blessed.js | blECSd |
|-----------|--------|
| `top: 0` | `setPosition(world, eid, x, 0)` |
| `left: 0` | `setPosition(world, eid, 0, y)` |
| `top: 'center'` | Calculate: `Math.floor((height - boxHeight) / 2)` |
| `width: '50%'` | Calculate: `Math.floor(terminalWidth * 0.5)` |
| `width: 10` | `setDimensions(world, eid, 10, height)` |
| `height: 10` | `setDimensions(world, eid, width, 10)` |

### Styling

| blessed.js | blECSd |
|-----------|--------|
| `style: { fg: 'white' }` | `Renderable.fg[eid] = 0xffffff` |
| `style: { bg: 'blue' }` | `Renderable.bg[eid] = 0x0000ff` |
| `style: { bold: true }` | Use ANSI attributes (planned) |
| `border: { type: 'line' }` | `setBorder(world, eid, { style: 'single' })` |

### Content

| blessed.js | blECSd |
|-----------|--------|
| `content: 'Hello'` | `setText(world, eid, 'Hello')` from `blecsd` |
| `setContent('New')` | `setText(world, eid, 'New')` |
| `getContent()` | `getText(world, eid)` from `blecsd` |
| `tags: true` (markup) | Not supported (use explicit styling) |

### Events

| blessed.js | blECSd |
|-----------|--------|
| `element.on('focus', ...)` | Use `focusSystem` from `blecsd` + event bus from `blecsd/core` |
| `element.on('click', ...)` | Use `createProgram()` from `blecsd/terminal` for mouse events |
| `element.on('keypress', ...)` | Use `createProgram()` from `blecsd/terminal` for key events |
| `element.key('enter', ...)` | Use key binding registry from `blecsd/core` |
| `element.emit('custom', data)` | `createEventBus<T>()` from `blecsd/core` |

### Focus

| blessed.js | blECSd |
|-----------|--------|
| `element.focus()` | `focusEntity(world, eid)` from `blecsd/systems` |
| `element.isFocused()` | Check via focus component query |
| `screen.focusNext()` | `focusNext(world)` |
| `screen.focusPrevious()` | `focusPrev(world)` |

### Visibility

| blessed.js | blECSd |
|-----------|--------|
| `element.show()` | `Renderable.visible[eid] = 1` |
| `element.hide()` | `Renderable.visible[eid] = 0` |
| `element.hidden` | `Renderable.visible[eid] === 0` |

### Layout

| blessed.js | blECSd |
|-----------|--------|
| `parent: screen` | `setParent(world, child, parent)` from `blecsd/components` |
| `children: [...]` | Add multiple children with `setParent` |
| `element.append(child)` | `setParent(world, child, parent)` from `blecsd/components` |
| `element.remove(child)` | `removeEntity(world, child)` |

## Migration Strategy

### Step 1: Install blECSd

```bash
npm uninstall blessed
npm install blecsd
```

### Step 2: Choose Migration Approach

**Option A: Complete Rewrite (Recommended)**
- Start fresh with blECSd patterns
- Cleaner code, better performance
- Less technical debt

**Option B: Gradual Migration**
- Port one screen/widget at a time
- Run both libraries in parallel (requires separate processes)
- Slower but lower risk

### Step 3: Map Your Components

Create a mapping document for your app:

```typescript
// blessed.js → blECSd mapping for MyApp

// OLD: MainScreen (blessed)
// NEW: createMainScreen(world) (blECSd)

// OLD: SidebarWidget (blessed)
// NEW: createSidebar(world, parentEntity) (blECSd)

// OLD: DataTable (blessed)
// NEW: createTable(world, entity, data) (blECSd)
```

### Step 4: Port Screen by Screen

Start with the simplest screen, then move to complex ones.

## Common Patterns

### Pattern 1: Simple Box

**blessed.js:**
<!-- blecsd-doccheck:ignore -->
```javascript
const box = blessed.box({
  parent: screen,
  top: 5,
  left: 10,
  width: 30,
  height: 10,
  content: 'Hello!',
  border: { type: 'line' },
  style: {
    fg: 'white',
    bg: 'black',
    border: { fg: 'blue' }
  }
});

screen.append(box);
screen.render();
```

**blECSd:**
```typescript
import { createWorld, addEntity, addComponent } from 'blecsd/core';
import { setPosition, setDimensions } from 'blecsd/components';
import { renderSystem, outputSystem } from 'blecsd/systems';
import { setText, setBorder } from 'blecsd/components';
import { createGameLoop, LoopPhase } from 'blecsd/core';

const world = createWorld();
const box = addEntity(world);

setPosition(world, box, 10, 5);
setDimensions(world, box, 30, 10);
setText(world, box, 'Hello!');
setBorder(world, box, { style: 'single', color: 0x0000ff });

const loop = createGameLoop(world, { targetFPS: 60 });
loop.registerSystem(LoopPhase.RENDER, renderSystem);
loop.registerSystem(LoopPhase.POST_RENDER, outputSystem);
loop.start();
```

### Pattern 2: Interactive List

**blessed.js:**
<!-- blecsd-doccheck:ignore -->
```javascript
const list = blessed.list({
  parent: screen,
  top: 2,
  left: 2,
  width: 30,
  height: 10,
  items: ['Item 1', 'Item 2', 'Item 3'],
  keys: true,
  vi: true,
  mouse: true,
  style: {
    selected: {
      bg: 'blue'
    }
  }
});

list.on('select', (item, index) => {
  console.log(`Selected: ${item.content} (${index})`);
});

screen.render();
```

**blECSd:**
```typescript
import {
  createWorld,
  addEntity,
  createGameLoop,
  LoopPhase,
} from 'blecsd/core';
import { setPosition } from 'blecsd/components';
import { createListEntity } from 'blecsd';
import {
  inputSystem,
  focusSystem,
  renderSystem,
  outputSystem,
  queueKeyEvent,
  getInputEventBus,
} from 'blecsd/systems';

const world = createWorld();

const listEntity = createListEntity(world, {
  x: 2,
  y: 2,
  width: 30,
  height: 10,
  items: ['Item 1', 'Item 2', 'Item 3'],
});

void addEntity;

// Listen for selection via event bus
const inputBus = getInputEventBus();
inputBus.on('select', (event: { entity: number; index: number; item: string }) => {
  if (event.entity === listEntity) {
    console.log(`Selected: ${event.item} (${event.index})`);
  }
});

// Queue key events (in a real app, read from process.stdin)
queueKeyEvent({ name: 'j', sequence: 'j', ctrl: false, meta: false, shift: false, full: 'j' });

// Setup game loop
const loop2 = createGameLoop(world, { targetFPS: 60 });
loop2.registerInputSystem(inputSystem);
loop2.registerSystem(LoopPhase.UPDATE, focusSystem);
loop2.registerSystem(LoopPhase.RENDER, renderSystem);
loop2.registerSystem(LoopPhase.POST_RENDER, outputSystem);

loop2.start();
loop2.stop();
```

### Pattern 3: Form with Input

**blessed.js:**
<!-- blecsd-doccheck:ignore -->
```javascript
const form = blessed.form({
  parent: screen,
  top: 2,
  left: 2,
  width: 40,
  height: 12,
  keys: true
});

const nameInput = blessed.textbox({
  parent: form,
  name: 'name',
  top: 1,
  left: 1,
  width: 30,
  height: 1,
  inputOnFocus: true
});

const submitButton = blessed.button({
  parent: form,
  content: 'Submit',
  top: 4,
  left: 1,
  width: 10,
  height: 3
});

submitButton.on('press', () => {
  form.submit();
});

form.on('submit', (data) => {
  console.log('Form data:', data);
});

screen.render();
```

**blECSd:**
```typescript
import {
  createWorld,
  addEntity,
  createGameLoop,
  LoopPhase,
} from 'blecsd/core';
import { setPosition } from 'blecsd/components';
import { createBoxEntity, createButtonEntity } from 'blecsd';
import {
  inputSystem,
  focusSystem,
  renderSystem,
  outputSystem,
  getInputEventBus,
} from 'blecsd/systems';

const world = createWorld();

// Container
const formContainer = createBoxEntity(world, {
  x: 2,
  y: 2,
  width: 40,
  height: 12,
});

// Submit button
const submitButtonEntity = createButtonEntity(world, {
  label: 'Submit',
  x: 3,
  y: 6,
  width: 10,
  height: 3,
});

// Handle submit via event bus
const inputBus2 = getInputEventBus();
inputBus2.on('activate', (event: { entity: number }) => {
  if (event.entity === submitButtonEntity) {
    console.log('Form submitted');
  }
});

void formContainer; void addEntity; void setPosition;

// Setup game loop
const loop3 = createGameLoop(world, { targetFPS: 60 });
loop3.registerInputSystem(inputSystem);
loop3.registerSystem(LoopPhase.UPDATE, focusSystem);
loop3.registerSystem(LoopPhase.RENDER, renderSystem);
loop3.registerSystem(LoopPhase.POST_RENDER, outputSystem);

loop3.start();
loop3.stop();
```

### Pattern 4: Updating Content

**blessed.js:**
<!-- blecsd-doccheck:ignore -->
```javascript
// Mutate directly
box.setContent('New content');
box.style.fg = 'red';
screen.render();  // Manual render required
```

**blECSd:**
```typescript
// Update component data
import { createWorld, addEntity } from 'blecsd/core';
import { setText } from 'blecsd';
import { markDirty } from 'blecsd/components';

const world = createWorld();
const box = addEntity(world);

setText(world, box, 'New content');
markDirty(world, box);
// Scheduler automatically re-renders dirty entities
```

### Pattern 5: Custom Rendering

**blessed.js:**
<!-- blecsd-doccheck:ignore -->
```javascript
// Override _render method (fragile)
MyWidget.prototype._render = function() {
  // Custom render logic
  return this._generateTags();
};
```

**blECSd:**
```typescript
// Create custom render system (clean)
import { createWorld } from 'blecsd/core';
import type { World } from 'blecsd/core';
import { query, createGameLoop, LoopPhase } from 'blecsd/core';
import { Position, Renderable } from 'blecsd/components';

function customRenderSystem(world: World): World {
  const entities = query(world, [Position, Renderable]);

  for (const eid of entities) {
    // Custom render logic per entity
    const x = Position.x[eid];
    const y = Position.y[eid];
    void x; void y;
    // ... render at (x, y)
  }

  return world;
}

// Register it
const world = createWorld();
const loop4 = createGameLoop(world, { targetFPS: 60 });
loop4.registerSystem(LoopPhase.RENDER, customRenderSystem);
loop4.start();
loop4.stop();
```

## Widget Migration

### Box → createBox

**blessed.js:**
<!-- blecsd-doccheck:ignore -->
```javascript
const box = blessed.box({
  parent: screen,
  top: 5,
  left: 10,
  width: 20,
  height: 5,
  content: 'Box content',
  border: 'line',
  style: {
    fg: 'white',
    border: { fg: 'cyan' }
  }
});
```

**blECSd:**
```typescript
import { createWorld } from 'blecsd/core';
import { createBoxEntity } from 'blecsd';
import { setText } from 'blecsd';

const world = createWorld();
const boxEntity = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 20,
  height: 5,
  fg: 0xffffff,
});
setText(world, boxEntity, 'Box content');
```

### List → createList

**blessed.js:**
<!-- blecsd-doccheck:ignore -->
```javascript
const list = blessed.list({
  parent: screen,
  items: ['One', 'Two', 'Three'],
  keys: true,
  vi: true,
  mouse: true,
  style: {
    selected: { bg: 'blue' }
  }
});

list.on('select', (item, index) => {
  console.log('Selected:', index);
});
```

**blECSd:**
```typescript
import { createWorld } from 'blecsd/core';
import { createListEntity } from 'blecsd';
import { getInputEventBus } from 'blecsd/systems';

const world = createWorld();
const listEid = createListEntity(world, {
  x: 2,
  y: 2,
  width: 30,
  height: 10,
  items: ['One', 'Two', 'Three'],
});

// Listen for selection via event bus
const selBus = getInputEventBus();
selBus.on('select', (event: { entity: number; index: number }) => {
  if (event.entity === listEid) {
    console.log('Selected:', event.index);
  }
});
```

### TextBox → createTextareaEntity

**blessed.js:**
<!-- blecsd-doccheck:ignore -->
```javascript
const input = blessed.textbox({
  parent: screen,
  top: 5,
  left: 2,
  height: 1,
  width: 20,
  inputOnFocus: true
});

input.on('submit', (value) => {
  console.log('Submitted:', value);
});
```

**blECSd:**
```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, setDimensions } from 'blecsd/components';

const world = createWorld();
// Text input entity - configure with position and dimensions components
const inputEntity = addEntity(world);
setPosition(world, inputEntity, 2, 5);
setDimensions(world, inputEntity, 20, 1);
```

### Table → createTable

**blessed.js:**
<!-- blecsd-doccheck:ignore -->
```javascript
const table = blessed.table({
  parent: screen,
  data: [
    ['Name', 'Age'],
    ['Alice', '30'],
    ['Bob', '25']
  ]
});
```

**blECSd:**
```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, setDimensions } from 'blecsd/components';

const world = createWorld();
// Table entity - data is managed via components
const tableEntity = addEntity(world);
setPosition(world, tableEntity, 2, 2);
setDimensions(world, tableEntity, 40, 10);
// Data rows are entities; headers and cell values are configured per component
```

## Event System Migration

### Event Listeners

**blessed.js:**
<!-- blecsd-doccheck:ignore -->
```javascript
// String-based events (no type safety)
element.on('focus', () => {
  console.log('Focused');
});

element.on('keypress', (ch, key) => {
  if (key.name === 'enter') {
    console.log('Enter pressed');
  }
});

element.on('click', (data) => {
  console.log('Clicked at:', data.x, data.y);
});
```

**blECSd:**
```typescript
// Typed event buses
import { getFocusEventBus, getInputEventBus } from 'blecsd/systems';

const focusBus = getFocusEventBus();
focusBus.on('focus', (event: { entity: number }) => {
  console.log('Focused entity:', event.entity);
});

const inputBus3 = getInputEventBus();
inputBus3.on('keypress', (event: { name: string; ctrl: boolean }) => {
  if (event.name === 'enter') {
    console.log('Enter pressed');
  }
});

inputBus3.on('click', (event: { entity: number; x: number; y: number }) => {
  console.log('Clicked entity:', event.entity);
  console.log('Position:', event.x, event.y);
});
```

### Custom Events

**blessed.js:**
<!-- blecsd-doccheck:ignore -->
```javascript
// Custom events on elements
element.on('myCustomEvent', (data) => {
  console.log('Custom event:', data);
});

// Emit
element.emit('myCustomEvent', { value: 42 });
```

**blECSd:**
```typescript
// Create typed event bus
import { createEventBus } from 'blecsd/core';

interface MyEvents {
  customEvent: { value: number };
  otherEvent: { message: string };
}

const myBus = createEventBus<MyEvents>();

myBus.on('customEvent', (event) => {
  console.log('Custom event:', event.value);  // Type-safe!
});

// Emit
myBus.emit('customEvent', { value: 42 });
```

## Breaking Changes

### No Global Screen

**blessed.js had a global screen:**
<!-- blecsd-doccheck:ignore -->
```javascript
const screen = blessed.screen();  // Global singleton
// All widgets implicitly know about screen
```

**blECSd requires explicit world:**
```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition } from 'blecsd/components';

const world = createWorld();  // NOT global
const entity = addEntity(world);
// Must pass world to every function
setPosition(world, entity, 10, 5);
```

**Migration:** Pass `world` everywhere. Store it in your app state if needed.

### No Automatic Rendering

**blessed.js auto-renders on mutations:**
<!-- blecsd-doccheck:ignore -->
```javascript
box.setContent('New');  // Implicitly calls screen.render()
```

**blECSd requires explicit dirty tracking:**
```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setText } from 'blecsd';
import { markDirty } from 'blecsd/components';

const world = createWorld();
const box = addEntity(world);
setText(world, box, 'New');
markDirty(world, box);  // Must mark dirty
// Scheduler auto-renders dirty entities
```

**Migration:** Call `markDirty()` after mutations, or use helper functions like `setContent()`.

### No String-Based Positioning

**blessed.js supports string positions:**
<!-- blecsd-doccheck:ignore -->
```javascript
const box = blessed.box({
  top: 'center',      // String
  left: '50%',        // Percentage
  width: '50%-5'      // Expression
});
```

**blECSd uses absolute numbers:**
```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, setDimensions } from 'blecsd/components';

const world = createWorld();
const box = addEntity(world);
const terminalWidth = process.stdout.columns ?? 80;
const terminalHeight = process.stdout.rows ?? 24;
const boxWidth = 40;
const boxHeight = 10;

// Calculate explicitly
const x = Math.floor(terminalWidth * 0.5);
const y = Math.floor((terminalHeight - boxHeight) / 2);

setPosition(world, box, x, y);
setDimensions(world, box, boxWidth, boxHeight);
```

**Migration:** Calculate positions manually or create helper functions.

### No Tags/Markup

**blessed.js supports markup:**
<!-- blecsd-doccheck:ignore -->
```javascript
box.setContent('Hello {bold}world{/bold}!');
element.tags = true;
```

**blECSd does NOT support markup:**
```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setText } from 'blecsd';

const world = createWorld();
const box = addEntity(world);
// Use explicit styling instead
setText(world, box, 'Hello world!');
// Apply styles via components, not markup
```

**Migration:** Remove markup, use component styling.

### No Method Chaining

**blessed.js supports chaining:**
<!-- blecsd-doccheck:ignore -->
```javascript
box.setContent('Hello')
   .show()
   .focus();
```

**blECSd uses separate calls:**
```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setText } from 'blecsd';
import { Renderable, focusEntity } from 'blecsd/components';

const world = createWorld();
const box = addEntity(world);
setText(world, box, 'Hello');
Renderable.visible[box] = 1;  // show
focusEntity(world, box);
```

**Migration:** Break chains into individual calls.

## Gradual Migration Path

### Phase 1: Read Documentation

1. Read [Understanding ECS](./understanding-ecs.md)
2. Read [How-To Guides](./how-to.md)
3. Study [API Reference](../api/)

### Phase 2: Set Up Project

```bash
npm install blecsd
```

Create initial structure:

```typescript
// In your app setup (e.g., src/app.ts)
import { createWorld, createGameLoop, LoopPhase } from 'blecsd/core';

// Create the shared world (export this to other modules)
const world = createWorld();

// Create the game loop
const loop = createGameLoop(world, { targetFPS: 60 });

void world; void loop; void LoopPhase;
```

### Phase 3: Port Simple Screens

Start with screens that have:
- Few widgets
- No complex interactions
- Minimal state

### Phase 4: Port Complex Screens

Move to screens with:
- Multiple interactive widgets
- Forms and inputs
- Complex state management

### Phase 5: Clean Up

- Remove blessed.js
- Update tests
- Optimize performance

## Getting Help

### Resources

- [API Documentation](../api/)
- [How-To Guides](./how-to.md)
- [Examples](https://github.com/Kadajett/blECSd-Examples)
- [GitHub Issues](https://github.com/Kadajett/blECSd/issues)

### Common Questions

**Q: Can I run blessed.js and blECSd side-by-side?**
A: No, both control terminal state. Run in separate processes if needed.

**Q: Is there a compatibility layer?**
A: No. blECSd is a complete rewrite with different architecture.

**Q: How long does migration take?**
A: Depends on app size. Simple apps: 1-2 days. Complex apps: 1-2 weeks.

**Q: Do I need to learn ECS?**
A: Basic understanding helps, but widget APIs are high-level and familiar.

**Q: Can I reuse blessed.js widgets?**
A: No. Port them to blECSd patterns or create custom widgets.

## Comparison Table

| Feature | blessed.js | blECSd |
|---------|-----------|--------|
| **Architecture** | OOP + Inheritance | ECS + Composition |
| **TypeScript** | No | Yes (full) |
| **Performance** | Renders entire screen | Dirty tracking + virtualization |
| **Testability** | Hard (globals, mutation) | Easy (pure functions, no globals) |
| **Type Safety** | Runtime errors | Compile-time errors |
| **Learning Curve** | Moderate | Moderate (ECS concepts) |
| **Documentation** | Outdated | Modern, comprehensive |
| **Maintenance** | Abandoned (2016) | Active (2024+) |
| **Bundle Size** | ~200KB | ~150KB |
| **Node Support** | 0.10+ | 18+ |

## Example: Complete Migration

### Before (blessed.js)

<!-- blecsd-doccheck:ignore -->
```javascript
const blessed = require('blessed');

const screen = blessed.screen({
  smartCSR: true,
  title: 'My App'
});

const header = blessed.box({
  parent: screen,
  top: 0,
  left: 0,
  width: '100%',
  height: 3,
  content: '{center}My Application{/center}',
  tags: true,
  style: {
    fg: 'white',
    bg: 'blue'
  }
});

const list = blessed.list({
  parent: screen,
  top: 3,
  left: 0,
  width: '50%',
  height: '100%-3',
  items: ['Item 1', 'Item 2', 'Item 3'],
  keys: true,
  vi: true,
  mouse: true,
  style: {
    selected: {
      bg: 'green'
    }
  }
});

list.on('select', (item, index) => {
  detail.setContent(`Selected: ${item.content}`);
  screen.render();
});

const detail = blessed.box({
  parent: screen,
  top: 3,
  left: '50%',
  width: '50%',
  height: '100%-3',
  content: 'Select an item...',
  border: {
    type: 'line'
  }
});

screen.key(['escape', 'q', 'C-c'], () => {
  return process.exit(0);
});

screen.render();
```

### After (blECSd)

```typescript
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
  setBorder,
  Renderable,
} from 'blecsd/components';
import { createListEntity } from 'blecsd';
import { setText } from 'blecsd';
import {
  inputSystem,
  focusSystem,
  layoutSystem,
  renderSystem,
  outputSystem,
  queueKeyEvent,
  getInputEventBus,
} from 'blecsd/systems';

const world = createWorld();

// Get terminal size
const termWidth = process.stdout.columns ?? 80;
const termHeight = process.stdout.rows ?? 24;

// Header
const header = addEntity(world);
setPosition(world, header, 0, 0);
setDimensions(world, header, termWidth, 3);
setText(world, header, 'My Application');
addComponent(world, header, Renderable);
Renderable.fg[header] = 0xffffff;
Renderable.bg[header] = 0x0000ff;

// List
const listEid2 = createListEntity(world, {
  x: 0,
  y: 3,
  width: Math.floor(termWidth / 2),
  height: termHeight - 3,
  items: ['Item 1', 'Item 2', 'Item 3'],
});

// Detail pane
const detail = addEntity(world);
setPosition(world, detail, Math.floor(termWidth / 2), 3);
setDimensions(world, detail, Math.floor(termWidth / 2), termHeight - 3);
setText(world, detail, 'Select an item...');
setBorder(world, detail, { style: 'single' });

// Handle selection via event bus
const selectionBus = getInputEventBus();
selectionBus.on('select', (event: { entity: number; item: string }) => {
  if (event.entity === listEid2) {
    setText(world, detail, `Selected: ${event.item}`);
  }
});

// Handle quit keys
selectionBus.on('keypress', (event: { name: string; ctrl: boolean }) => {
  if (
    event.name === 'escape' ||
    event.name === 'q' ||
    (event.name === 'c' && event.ctrl)
  ) {
    // process.exit(0) in real app
  }
});

// Queue key events (in real app, read from process.stdin via parseKeyBuffer)
queueKeyEvent({ name: 'j', sequence: 'j', ctrl: false, meta: false, shift: false, full: 'j' });

// Setup game loop
const loop5 = createGameLoop(world, { targetFPS: 60 });
loop5.registerInputSystem(inputSystem);
loop5.registerSystem(LoopPhase.UPDATE, focusSystem);
loop5.registerSystem(LoopPhase.LAYOUT, layoutSystem);
loop5.registerSystem(LoopPhase.RENDER, renderSystem);
loop5.registerSystem(LoopPhase.POST_RENDER, outputSystem);

loop5.start();
loop5.stop();
```

## Summary

### Key Takeaways

1. **Different paradigm**: OOP → ECS requires mental shift
2. **Explicit control**: You own the world, you control the loop
3. **Type safety**: TypeScript catches errors at compile time
4. **Better performance**: Dirty tracking and virtualization
5. **Modern patterns**: Composition, pure functions, immutability

### Migration Checklist

- [ ] Read ECS documentation
- [ ] Install blECSd
- [ ] Create world and scheduler
- [ ] Port simplest screen first
- [ ] Set up event handlers
- [ ] Test thoroughly
- [ ] Port remaining screens
- [ ] Remove blessed.js
- [ ] Update dependencies
- [ ] Optimize performance

### Next Steps

1. Read [Understanding ECS](./understanding-ecs.md)
2. Try [Quick Start](../../README.md#quick-start)
3. Study [How-To Guides](./how-to.md)
4. Build a prototype
5. Migrate incrementally

Good luck with your migration! 🚀
