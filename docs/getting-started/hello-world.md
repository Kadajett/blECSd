# Hello World

A minimal example using blECSd components.

## The Code

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, setDimensions } from 'blecsd/components';
import {
  setStyle,
  setBorder,
  setContent,
  getContent,
  BorderType,
} from 'blecsd/components';

// Create world and entity
const world = createWorld();
const box = addEntity(world);

// Position at 5, 3
setPosition(world, box, 5, 3);

// Size 30x5
setDimensions(world, box, 30, 5);

// White text on blue background
setStyle(world, box, {
  fg: '#ffffff',
  bg: '#0066cc',
});

// Line border on all sides
setBorder(world, box, {
  type: BorderType.Line,
  left: true,
  right: true,
  top: true,
  bottom: true,
});

// Text content
setContent(world, box, 'Hello, Terminal!');

// Read back the data
const pos = getPosition(world, box);
const content = getContent(world, box);

console.log(`Box at ${pos?.x}, ${pos?.y}`);
console.log(`Content: ${content}`);
```

## Alternative: Namespace Imports

For larger applications, you can use namespace imports from `blecsd/components` to organize your code:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { position, dimensions, content, border, renderable } from 'blecsd/components';
import { BorderType } from 'blecsd/components';

// Create world and entity
const world = createWorld();
const box = addEntity(world);

// Position at 5, 3
position.set(world, box, 5, 3);

// Size 30x5
dimensions.set(world, box, 30, 5);

// White text on blue background
renderable.setStyle(world, box, {
  fg: '#ffffff',
  bg: '#0066cc',
});

// Line border on all sides
border.set(world, box, {
  type: BorderType.Line,
  left: true,
  right: true,
  top: true,
  bottom: true,
});

// Text content
content.setText(world, box, 'Hello, Terminal!');

// Read back the data
const pos = position.get(world, box);
const text = content.getText(world, box);

console.log(`Box at ${pos?.x}, ${pos?.y}`);
console.log(`Content: ${text}`);
```

Namespace imports help organize related functions and reduce naming conflicts as your application grows.

## What Happened

1. **createWorld()** initializes a bitECS world
2. **addEntity()** creates an entity (returns an integer ID)
3. **setPosition()** adds the Position component with coordinates
4. **setDimensions()** adds the Dimensions component with size
5. **setStyle()** adds the Renderable component with colors
6. **setBorder()** adds the Border component
7. **setContent()** adds the Content component with text

## Using Entity Factories

Entity factories create entities with multiple components pre-configured:

```typescript
import { createWorld, createBoxEntity, createTextEntity } from 'blecsd/core';
import { BorderType } from 'blecsd/components';

const world = createWorld();

// Creates entity with Position, Dimensions, Renderable, Border
const box = createBoxEntity(world, {
  x: 5,
  y: 3,
  width: 30,
  height: 5,
  fg: 0xffffffff,
  bg: 0x0066ccff,
  border: {
    type: BorderType.Line,
    left: true,
    right: true,
    top: true,
    bottom: true,
  },
});

// Creates entity with Position, Dimensions, Renderable, Content
const text = createTextEntity(world, {
  x: 7,
  y: 5,
  text: 'Hello, Terminal!',
  fg: 0xffffffff,
});
```

## Rendering

blECSd includes a built-in two-phase rendering pipeline. The `renderSystem` draws entities into a screen buffer, and the `outputSystem` diffs that buffer against the previous frame and flushes changes to the terminal.

Before the pipeline can render, you must initialize the buffers:

```typescript
import { createWorld, addEntity, createScreenEntity } from 'blecsd/core';
import { setPosition, setDimensions } from 'blecsd/components';
import {
  layoutSystem, renderSystem, outputSystem, cleanup,
  setOutputStream, setOutputBuffer, setRenderBuffer,
} from 'blecsd/systems';
import { setContent, setStyle } from 'blecsd/components';
import { createDoubleBuffer, getBackBuffer } from 'blecsd/terminal';
import { createDirtyTracker } from 'blecsd/core';

const cols = process.stdout.columns ?? 80;
const rows = process.stdout.rows ?? 24;

const world = createWorld();
createScreenEntity(world, { width: cols, height: rows });

// Initialize the render pipeline buffers
setOutputStream(process.stdout);
const db = createDoubleBuffer(cols, rows);
setOutputBuffer(db);
setRenderBuffer(createDirtyTracker(cols, rows), getBackBuffer(db));

// ... create entities with position, dimensions, content, style ...

// Run the rendering pipeline
layoutSystem(world);   // Compute positions and sizes
renderSystem(world);   // Render entities to screen buffer
outputSystem(world);   // Diff and flush changes to terminal

// When done, clean up terminal state
cleanup(world);
```

For low-level terminal control, you can use the terminal module directly:

```typescript
import { cursor, style, screen } from 'blecsd/terminal';

// These namespaces provide ANSI escape sequence generators
// cursor.move(), style.fgRgb(), screen.alternateOn(), etc.
```

## A Simple Render Loop

Combining `createProgram()` for terminal management with the ECS render pipeline:

```typescript
import { createWorld, addEntity, createScreenEntity } from 'blecsd/core';
import { setPosition, setDimensions } from 'blecsd/components';
import {
  layoutSystem, renderSystem, outputSystem, cleanup,
  setOutputStream, setOutputBuffer, setRenderBuffer,
} from 'blecsd/systems';
import { setContent, setStyle } from 'blecsd/components';
import { createProgram, createDoubleBuffer, getBackBuffer } from 'blecsd/terminal';
import { createDirtyTracker } from 'blecsd/core';

const cols = process.stdout.columns ?? 80;
const rows = process.stdout.rows ?? 24;

// 1. Initialize the terminal (alternate screen, cursor, raw mode)
const program = createProgram();
await program.init();

// 2. Create the ECS world and screen entity
const world = createWorld();
createScreenEntity(world, { width: cols, height: rows });

// 3. Wire up the render pipeline buffers
setOutputStream(process.stdout);
const db = createDoubleBuffer(cols, rows);
setOutputBuffer(db);
setRenderBuffer(createDirtyTracker(cols, rows), getBackBuffer(db));

// 4. Create entities
const statusIndicator = addEntity(world);
setPosition(world, statusIndicator, 10, 5);
setDimensions(world, statusIndicator, 10, 1);
setStyle(world, statusIndicator, { fg: '#00ff00' });
setContent(world, statusIndicator, '● Online');

// 5. Render
function render(): void {
  layoutSystem(world);
  renderSystem(world);
  outputSystem(world);
}

render();

// Clean up on exit
process.on('exit', () => {
  cleanup(world);
  program.destroy();
});
```

## Input Handling

Add keyboard input using `createProgram` from `blecsd/terminal`:

```typescript
import { createProgram } from 'blecsd/terminal';
import { moveBy, getPosition } from 'blecsd/components';

const program = createProgram();
await program.init();

program.on('key', (event) => {
  if (event.name === 'q' || (event.ctrl && event.name === 'c')) {
    cleanup(world);
    program.destroy();
    process.exit(0);
  }

  // Arrow keys move the selected element
  if (event.name === 'up') moveBy(world, statusIndicator, 0, -1);
  if (event.name === 'down') moveBy(world, statusIndicator, 0, 1);
  if (event.name === 'left') moveBy(world, statusIndicator, -1, 0);
  if (event.name === 'right') moveBy(world, statusIndicator, 1, 0);

  render();
});
```
