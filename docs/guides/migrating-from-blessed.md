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
  setPosition,
  setDimensions,
  setContent,
  setBorder,
  setRenderable,
  createScheduler,
  LoopPhase,
  renderSystem,
  outputSystem,
} from 'blecsd';

// YOU create the world (no global singleton)
const world = createWorld();

// Entities are just IDs
const box = addEntity(world);

// Components are data (no inheritance)
setPosition(world, box, 40, 12);  // Absolute position
setDimensions(world, box, 40, 12);
setContent(world, box, 'Hello world!');
setBorder(world, box, { style: 'line', color: 0xf0f0f0 });
setRenderable(world, box, { fg: 0xffffff, bg: 0x0000ff });

// YOU control the loop
const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.RENDER, renderSystem);
scheduler.addSystem(LoopPhase.POST_RENDER, outputSystem);
scheduler.start();
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
| `screen.key('q', ...)` | `getInputEventBus().on('keypress', ...)` |

### Creating Widgets

| blessed.js | blECSd |
|-----------|--------|
| `blessed.box({ ... })` | `createBox(world, entity, { ... })` |
| `blessed.text({ ... })` | `createText(world, entity, { ... })` |
| `blessed.list({ ... })` | `createList(world, entity, { ... })` |
| `blessed.input({ ... })` | `createTextInput(world, entity, { ... })` |
| `blessed.button({ ... })` | `createButton(world, entity, { ... })` |
| `blessed.table({ ... })` | `createTable(world, entity, { ... })` |

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
| `style: { fg: 'white' }` | `setRenderable(world, eid, { fg: 0xffffff })` |
| `style: { bg: 'blue' }` | `setRenderable(world, eid, { bg: 0x0000ff })` |
| `style: { bold: true }` | Use ANSI attributes (planned) |
| `border: { type: 'line' }` | `setBorder(world, eid, { style: 'single' })` |

### Content

| blessed.js | blECSd |
|-----------|--------|
| `content: 'Hello'` | `setContent(world, eid, 'Hello')` |
| `setContent('New')` | `Content.value[eid] = stringToId('New')` |
| `getContent()` | `getContent(world, eid)` |
| `tags: true` (markup) | Not supported (use explicit styling) |

### Events

| blessed.js | blECSd |
|-----------|--------|
| `element.on('focus', ...)` | `getFocusEventBus().on('focus', ...)` |
| `element.on('click', ...)` | `getInputEventBus().on('click', ...)` |
| `element.on('keypress', ...)` | `getInputEventBus().on('keypress', ...)` |
| `element.key('enter', ...)` | Filter keypress events by name |
| `element.emit('custom', data)` | `createEventBus<T>(); bus.emit('custom', data)` |

### Focus

| blessed.js | blECSd |
|-----------|--------|
| `element.focus()` | `focusEntity(world, eid)` |
| `element.isFocused()` | `getFocused(world) === eid` |
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
| `parent: screen` | `setParent(world, child, parent)` |
| `children: [...]` | Add multiple children with `setParent` |
| `element.append(child)` | `setParent(world, child, parent)` |
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
import {
  createWorld,
  addEntity,
  setPosition,
  setDimensions,
  setContent,
  setBorder,
  setRenderable,
  createScheduler,
  LoopPhase,
  renderSystem,
  outputSystem,
} from 'blecsd';

const world = createWorld();
const box = addEntity(world);

setPosition(world, box, 10, 5);
setDimensions(world, box, 30, 10);
setContent(world, box, 'Hello!');
setBorder(world, box, { style: 'single', color: 0x0000ff });
setRenderable(world, box, { fg: 0xffffff, bg: 0x000000 });

const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.RENDER, renderSystem);
scheduler.addSystem(LoopPhase.POST_RENDER, outputSystem);
scheduler.start();
```

### Pattern 2: Interactive List

**blessed.js:**
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
  setPosition,
  createList,
  createScheduler,
  LoopPhase,
  inputSystem,
  focusSystem,
  renderSystem,
  outputSystem,
  parseKeyEvent,
  queueKeyEvent,
} from 'blecsd';

const world = createWorld();
const listEntity = addEntity(world);

setPosition(world, listEntity, 2, 2);

const list = createList(world, listEntity, {
  width: 30,
  height: 10,
  items: ['Item 1', 'Item 2', 'Item 3'],
});

// Listen for selection events
list.on('select', (event) => {
  console.log(`Selected: ${event.item} (${event.index})`);
});

// Setup input
process.stdin.setRawMode(true);
process.stdin.on('data', (buffer) => {
  const keyEvent = parseKeyEvent(buffer);
  if (keyEvent) {
    queueKeyEvent(keyEvent);
  }
});

// Setup scheduler
const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.INPUT, inputSystem);
scheduler.addSystem(LoopPhase.UPDATE, focusSystem);
scheduler.addSystem(LoopPhase.RENDER, renderSystem);
scheduler.addSystem(LoopPhase.POST_RENDER, outputSystem);

scheduler.start();
```

### Pattern 3: Form with Input

**blessed.js:**
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
  setPosition,
  createTextInput,
  createButton,
  createBox,
  createScheduler,
  LoopPhase,
  inputSystem,
  focusSystem,
  renderSystem,
  outputSystem,
} from 'blecsd';

const world = createWorld();

// Container
const formContainer = addEntity(world);
setPosition(world, formContainer, 2, 2);
createBox(world, formContainer, {
  width: 40,
  height: 12,
  border: { style: 'single' },
});

// Name input
const nameInputEntity = addEntity(world);
setPosition(world, nameInputEntity, 3, 3);
const nameInput = createTextInput(world, nameInputEntity, {
  width: 30,
  placeholder: 'Enter name...',
});

// Submit button
const submitButtonEntity = addEntity(world);
setPosition(world, submitButtonEntity, 3, 6);
const submitButton = createButton(world, submitButtonEntity, {
  label: 'Submit',
  width: 10,
  height: 3,
});

// Handle submit
submitButton.onClick(() => {
  const name = nameInput.getValue();
  console.log('Form data:', { name });
});

// Setup scheduler
const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.INPUT, inputSystem);
scheduler.addSystem(LoopPhase.UPDATE, focusSystem);
scheduler.addSystem(LoopPhase.RENDER, renderSystem);
scheduler.addSystem(LoopPhase.POST_RENDER, outputSystem);

scheduler.start();
```

### Pattern 4: Updating Content

**blessed.js:**
```javascript
// Mutate directly
box.setContent('New content');
box.style.fg = 'red';
screen.render();  // Manual render required
```

**blECSd:**
```typescript
// Update component data
import { Content, Renderable, markDirty } from 'blecsd';

Content.value[box] = registerString('New content');
Renderable.fg[box] = 0xff0000;  // Red
markDirty(world, box);  // Mark for re-render

// Scheduler automatically re-renders dirty entities
```

### Pattern 5: Custom Rendering

**blessed.js:**
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
import { query, Position, Renderable, type World } from 'blecsd';

function customRenderSystem(world: World): World {
  const entities = query(world, [Position, MyCustomComponent]);

  for (const eid of entities) {
    // Custom render logic
    renderCustomWidget(world, eid);
  }

  return world;
}

// Register it
scheduler.addSystem(LoopPhase.RENDER, customRenderSystem);
```

## Widget Migration

### Box → createBox

**blessed.js:**
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
const boxEntity = addEntity(world);
setPosition(world, boxEntity, 10, 5);

createBox(world, boxEntity, {
  width: 20,
  height: 5,
  content: 'Box content',
  border: { style: 'single', color: 0x00ffff },
  fg: 0xffffff,
});
```

### List → createList

**blessed.js:**
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
const listEntity = addEntity(world);
setPosition(world, listEntity, 2, 2);

const list = createList(world, listEntity, {
  width: 30,
  height: 10,
  items: ['One', 'Two', 'Three'],
  selectedBg: 0x0000ff,
});

list.on('select', (event) => {
  console.log('Selected:', event.index);
});
```

### TextBox → createTextInput

**blessed.js:**
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
const inputEntity = addEntity(world);
setPosition(world, inputEntity, 2, 5);

const input = createTextInput(world, inputEntity, {
  width: 20,
  placeholder: 'Type here...',
});

input.onSubmit((value) => {
  console.log('Submitted:', value);
});
```

### Table → createTable

**blessed.js:**
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
const tableEntity = addEntity(world);
setPosition(world, tableEntity, 2, 2);

const table = createTable(world, tableEntity, {
  width: 40,
  height: 10,
  headers: ['Name', 'Age'],
  data: [
    ['Alice', '30'],
    ['Bob', '25']
  ],
});
```

## Event System Migration

### Event Listeners

**blessed.js:**
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
import { getFocusEventBus, getInputEventBus } from 'blecsd';

const focusBus = getFocusEventBus();
focusBus.on('focus', (event) => {
  console.log('Focused entity:', event.entity);
});

const inputBus = getInputEventBus();
inputBus.on('keypress', (event) => {
  if (event.name === 'enter') {
    console.log('Enter pressed');
  }
});

inputBus.on('click', (event) => {
  console.log('Clicked entity:', event.entity);
  console.log('Position:', event.x, event.y);
});
```

### Custom Events

**blessed.js:**
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
import { createEventBus } from 'blecsd';

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
```javascript
const screen = blessed.screen();  // Global singleton
// All widgets implicitly know about screen
```

**blECSd requires explicit world:**
```typescript
const world = createWorld();  // NOT global
// Must pass world to every function
setPosition(world, entity, 10, 5);
```

**Migration:** Pass `world` everywhere. Store it in your app state if needed.

### No Automatic Rendering

**blessed.js auto-renders on mutations:**
```javascript
box.setContent('New');  // Implicitly calls screen.render()
```

**blECSd requires explicit dirty tracking:**
```typescript
Content.value[box] = registerString('New');
markDirty(world, box);  // Must mark dirty
// Scheduler auto-renders dirty entities
```

**Migration:** Call `markDirty()` after mutations, or use helper functions like `setContent()`.

### No String-Based Positioning

**blessed.js supports string positions:**
```javascript
const box = blessed.box({
  top: 'center',      // String
  left: '50%',        // Percentage
  width: '50%-5'      // Expression
});
```

**blECSd uses absolute numbers:**
```typescript
// Calculate explicitly
const x = Math.floor(terminalWidth * 0.5);
const y = Math.floor((terminalHeight - boxHeight) / 2);

setPosition(world, box, x, y);
setDimensions(world, box, width, height);
```

**Migration:** Calculate positions manually or create helper functions.

### No Tags/Markup

**blessed.js supports markup:**
```javascript
box.setContent('Hello {bold}world{/bold}!');
element.tags = true;
```

**blECSd does NOT support markup:**
```typescript
// Use explicit styling instead
setContent(world, box, 'Hello world!');
// Apply styles via components, not markup
```

**Migration:** Remove markup, use component styling.

### No Method Chaining

**blessed.js supports chaining:**
```javascript
box.setContent('Hello')
   .show()
   .focus();
```

**blECSd uses separate calls:**
```typescript
setContent(world, box, 'Hello');
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
// src/world.ts
import { createWorld } from 'blecsd';

export const world = createWorld();

// src/scheduler.ts
import { createScheduler, LoopPhase } from 'blecsd';
import { world } from './world';

export const scheduler = createScheduler(world, { targetFPS: 60 });
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
- [Examples](../examples/)
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
  setPosition,
  setDimensions,
  setContent,
  setRenderable,
  setBorder,
  createList,
  createScheduler,
  LoopPhase,
  inputSystem,
  focusSystem,
  layoutSystem,
  renderSystem,
  outputSystem,
  parseKeyEvent,
  queueKeyEvent,
  getInputEventBus,
} from 'blecsd';

const world = createWorld();

// Get terminal size
const termWidth = process.stdout.columns ?? 80;
const termHeight = process.stdout.rows ?? 24;

// Header
const header = addEntity(world);
setPosition(world, header, 0, 0);
setDimensions(world, header, termWidth, 3);
setContent(world, header, 'My Application');
setRenderable(world, header, { fg: 0xffffff, bg: 0x0000ff });

// List
const listEntity = addEntity(world);
setPosition(world, listEntity, 0, 3);

const list = createList(world, listEntity, {
  width: Math.floor(termWidth / 2),
  height: termHeight - 3,
  items: ['Item 1', 'Item 2', 'Item 3'],
  selectedBg: 0x00ff00,
});

// Detail pane
const detail = addEntity(world);
setPosition(world, detail, Math.floor(termWidth / 2), 3);
setDimensions(world, detail, Math.floor(termWidth / 2), termHeight - 3);
setContent(world, detail, 'Select an item...');
setBorder(world, detail, { style: 'single' });

// Handle selection
list.on('select', (event) => {
  setContent(world, detail, `Selected: ${event.item}`);
});

// Setup input
process.stdin.setRawMode(true);
process.stdin.on('data', (buffer) => {
  const keyEvent = parseKeyEvent(buffer);
  if (keyEvent) {
    queueKeyEvent(keyEvent);
  }
});

// Handle quit keys
const inputBus = getInputEventBus();
inputBus.on('keypress', (event) => {
  if (
    event.name === 'escape' ||
    event.name === 'q' ||
    (event.name === 'c' && event.ctrl)
  ) {
    process.exit(0);
  }
});

// Setup scheduler
const scheduler = createScheduler(world, { targetFPS: 60 });
scheduler.addSystem(LoopPhase.INPUT, inputSystem);
scheduler.addSystem(LoopPhase.UPDATE, focusSystem);
scheduler.addSystem(LoopPhase.LAYOUT, layoutSystem);
scheduler.addSystem(LoopPhase.RENDER, renderSystem);
scheduler.addSystem(LoopPhase.POST_RENDER, outputSystem);

scheduler.start();
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
